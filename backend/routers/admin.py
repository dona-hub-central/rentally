from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from database import get_db
import models
import auth as auth_module
from utils.email import send_welcome_email

router = APIRouter()


class ConfirmFianzaRequest(BaseModel):
    notas: Optional[str] = None
    justificante_url: Optional[str] = None


class OrderStatusRequest(BaseModel):
    estado: str


class ImportClientsRequest(BaseModel):
    clients: List[dict]


@router.get("/admin/users")
def get_users(
    estado: Optional[str] = None,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.rol == "cliente")
    if estado:
        query = query.filter(models.User.estado == estado)
    users = query.order_by(models.User.created_at.desc()).all()

    result = []
    for u in users:
        fianza = db.query(models.Fianza).filter(models.Fianza.user_id == u.id).first()
        has_fianza = fianza.confirmada if fianza else False

        # Check contract
        active_contract = db.query(models.Contract).filter(models.Contract.activo == True).first()
        has_signed = False
        if active_contract:
            cc = db.query(models.ClientContract).filter(
                models.ClientContract.user_id == u.id,
                models.ClientContract.contract_id == active_contract.id,
                models.ClientContract.firmado == True
            ).first()
            has_signed = cc is not None

        result.append({
            "id": u.id,
            "email": u.email,
            "nombre": u.nombre,
            "empresa": u.empresa,
            "cif": u.cif,
            "telefono": u.telefono,
            "estado": u.estado,
            "email_verified": u.email_verified,
            "has_signed_contract": has_signed,
            "has_fianza": has_fianza,
            "created_at": u.created_at
        })
    return result


@router.put("/admin/users/{user_id}/approve")
def approve_user(
    user_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not user.email_verified:
        raise HTTPException(status_code=400, detail="El usuario no ha verificado su email")

    user.estado = "aprobado"
    db.commit()

    send_welcome_email(user.email, user.nombre, db)
    return {"message": f"Usuario {user.email} aprobado"}


@router.put("/admin/users/{user_id}/block")
def block_user(
    user_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.estado = "bloqueado"
    db.commit()
    return {"message": f"Usuario {user.email} bloqueado"}


@router.put("/admin/users/{user_id}/confirm-fianza")
def confirm_fianza(
    user_id: int,
    req: ConfirmFianzaRequest,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    fianza = db.query(models.Fianza).filter(models.Fianza.user_id == user_id).first()
    if not fianza:
        fianza = models.Fianza(user_id=user_id)
        db.add(fianza)

    fianza.confirmada = True
    fianza.confirmada_por = current_user.id
    fianza.confirmada_at = datetime.utcnow()
    if req.notas:
        fianza.notas = req.notas
    if req.justificante_url:
        fianza.justificante_url = req.justificante_url

    db.commit()
    return {"message": f"Fianza del usuario {user.email} confirmada"}


@router.get("/admin/orders")
def get_all_orders(
    estado: Optional[str] = None,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Order)
    if estado:
        query = query.filter(models.Order.estado == estado)
    orders = query.order_by(models.Order.created_at.desc()).all()

    result = []
    for o in orders:
        user = db.query(models.User).filter(models.User.id == o.user_id).first()
        items = db.query(models.OrderItem).filter(models.OrderItem.order_id == o.id).all()
        flags = db.query(models.OrderFlag).filter(models.OrderFlag.order_id == o.id, models.OrderFlag.resuelto == False).all()

        items_detail = []
        for item in items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            items_detail.append({
                "id": item.id,
                "product_id": item.product_id,
                "product_nombre": product.nombre if product else "Desconocido",
                "cantidad": item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal": item.subtotal
            })

        payment = db.query(models.Payment).filter(models.Payment.order_id == o.id).first()

        result.append({
            "id": o.id,
            "user_id": o.user_id,
            "user_nombre": user.nombre if user else "Desconocido",
            "user_empresa": user.empresa if user else "",
            "estado": o.estado,
            "tipo_transporte": o.tipo_transporte,
            "precio_transporte": o.precio_transporte,
            "subtotal": o.subtotal,
            "total": o.total,
            "notas": o.notas,
            "created_at": o.created_at,
            "items": items_detail,
            "flags": [{"id": f.id, "motivo": f.motivo} for f in flags],
            "payment": {
                "metodo": payment.metodo,
                "estado": payment.estado
            } if payment else None
        })
    return result


@router.put("/admin/orders/{order_id}/confirm")
def confirm_order_payment(
    order_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    payment = db.query(models.Payment).filter(models.Payment.order_id == order_id).first()
    if payment:
        payment.estado = "confirmado"
        payment.confirmado_por = current_user.id
        payment.confirmado_at = datetime.utcnow()

    order.estado = "confirmado"
    order.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Pedido #{order_id} confirmado"}


@router.put("/admin/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    req: OrderStatusRequest,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    valid_states = ["borrador", "pendiente", "confirmado", "en_preparacion", "enviado", "entregado", "cancelado"]
    if req.estado not in valid_states:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Debe ser uno de: {valid_states}")

    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    order.estado = req.estado
    order.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Estado del pedido #{order_id} actualizado a {req.estado}"}


@router.get("/admin/stats")
def get_stats(
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    total_pending_users = db.query(models.User).filter(
        models.User.rol == "cliente",
        models.User.estado.in_(["pendiente", "verificado"])
    ).count()

    today = date.today()
    orders_today = db.query(models.Order).filter(
        func.date(models.Order.created_at) == today
    ).count()

    first_day_month = today.replace(day=1)
    monthly_income = db.query(func.sum(models.Payment.importe)).filter(
        models.Payment.estado == "confirmado",
        func.date(models.Payment.confirmado_at) >= first_day_month
    ).scalar() or 0.0

    total_clients = db.query(models.User).filter(models.User.rol == "cliente").count()
    total_orders = db.query(models.Order).count()
    pending_orders = db.query(models.Order).filter(models.Order.estado == "pendiente").count()
    pending_addresses = db.query(models.Address).filter(models.Address.validada == False).count()

    return {
        "usuarios_pendientes": total_pending_users,
        "pedidos_hoy": orders_today,
        "ingresos_mes": monthly_income,
        "total_clientes": total_clients,
        "total_pedidos": total_orders,
        "pedidos_pendientes": pending_orders,
        "direcciones_pendientes": pending_addresses
    }


@router.post("/admin/import-clients")
def import_clients(
    req: ImportClientsRequest,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    imported = []
    for client_data in req.clients:
        email = client_data.get("email", "").lower()
        if not email:
            continue

        # Check if already imported
        existing = db.query(models.ClientImport).filter(models.ClientImport.email == email).first()
        if existing:
            continue

        import_record = models.ClientImport(
            email=email,
            nombre=client_data.get("nombre", ""),
            empresa=client_data.get("empresa", ""),
            estado="importado"
        )
        db.add(import_record)
        imported.append(email)

    db.commit()
    return {"message": f"Importados {len(imported)} clientes", "imported": imported}


@router.get("/admin/addresses")
def get_pending_addresses(
    validada: Optional[bool] = Query(None),
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Address)
    if validada is not None:
        query = query.filter(models.Address.validada == validada)

    addresses = query.order_by(models.Address.id.desc()).all()
    result = []
    for a in addresses:
        user = db.query(models.User).filter(models.User.id == a.user_id).first()
        result.append({
            "id": a.id,
            "user_id": a.user_id,
            "user_nombre": user.nombre if user else "Desconocido",
            "user_empresa": user.empresa if user else "",
            "nombre": a.nombre,
            "direccion_completa": a.direccion_completa,
            "ciudad": a.ciudad,
            "cp": a.cp,
            "validada": a.validada,
            "validada_at": a.validada_at,
            "portal": getattr(a, 'portal', None),
            "planta": getattr(a, 'planta', None),
            "puerta": getattr(a, 'puerta', None)
        })
    return result




class AdminAddressCreate(BaseModel):
    user_id: int
    nombre: str
    direccion_completa: str
    portal: Optional[str] = None
    planta: Optional[str] = None
    puerta: Optional[str] = None
    ciudad: Optional[str] = "Madrid"
    cp: Optional[str] = None


@router.post("/admin/addresses")
def admin_create_address(
    req: AdminAddressCreate,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    address = models.Address(
        user_id=req.user_id,
        nombre=req.nombre,
        direccion_completa=req.direccion_completa,
        ciudad=req.ciudad or "Madrid",
        cp=req.cp,
        validada=True,
        validada_por=current_user.id,
        validada_at=datetime.utcnow()
    )
    if hasattr(address, 'portal'): address.portal = req.portal
    if hasattr(address, 'planta'): address.planta = req.planta
    if hasattr(address, 'puerta'): address.puerta = req.puerta
    db.add(address)
    db.commit()
    db.refresh(address)
    return {"id": address.id, "message": "Dirección creada y validada"}

@router.put("/admin/addresses/{address_id}/validate")
def validate_address(
    address_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    address = db.query(models.Address).filter(models.Address.id == address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Dirección no encontrada")

    address.validada = True
    address.validada_por = current_user.id
    address.validada_at = datetime.utcnow()
    db.commit()
    return {"message": "Dirección validada"}


@router.put("/admin/addresses/{address_id}/reject")
def reject_address(
    address_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    address = db.query(models.Address).filter(models.Address.id == address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Dirección no encontrada")

    db.delete(address)
    db.commit()
    return {"message": "Dirección rechazada y eliminada"}


@router.put("/admin/users/{user_id}/exent-fianza")
def exent_fianza(
    user_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    """Marcar cliente como exento de fianza (sin fianza requerida)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    fianza = db.query(models.Fianza).filter(models.Fianza.user_id == user_id).first()
    if not fianza:
        fianza = models.Fianza(user_id=user_id)
        db.add(fianza)

    fianza.exenta = True
    fianza.confirmada = True  # Exenta = no necesita fianza = puede pedir
    fianza.confirmada_por = current_user.id
    fianza.confirmada_at = datetime.utcnow()
    fianza.notas = "Exento de fianza"
    db.commit()
    return {"ok": True, "mensaje": "Cliente marcado como exento de fianza"}


# ── Nuevos endpoints: detalle, edición y envío de contrato ──────────────────

class UpdateUserReq(BaseModel):
    nombre: Optional[str] = None
    empresa: Optional[str] = None
    cif: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None


@router.get('/admin/users/{user_id}')
def get_user_detail(
    user_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, 'Usuario no encontrado')

    fianza = db.query(models.Fianza).filter(models.Fianza.user_id == user_id).first()
    active_contract = db.query(models.Contract).filter(models.Contract.activo == True).first()
    cc = None
    if active_contract:
        cc = db.query(models.ClientContract).filter(
            models.ClientContract.user_id == user_id,
            models.ClientContract.contract_id == active_contract.id
        ).first()

    addresses = db.query(models.Address).filter(models.Address.user_id == user_id).all()
    orders = db.query(models.Order).filter(models.Order.user_id == user_id).order_by(models.Order.created_at.desc()).limit(10).all()

    return {
        'id': user.id,
        'email': user.email,
        'nombre': user.nombre,
        'empresa': user.empresa,
        'cif': user.cif,
        'telefono': user.telefono,
        'direccion': user.direccion,
        'rol': user.rol,
        'estado': user.estado,
        'email_verified': user.email_verified,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'has_fianza': (fianza.confirmada or fianza.exenta) if fianza else False,
        'fianza_exenta': fianza.exenta if fianza else False,
        'has_signed_contract': cc.firmado if cc else False,
        'contract_sent': cc is not None,
        'contract_otp_expires': cc.otp_expires.isoformat() if cc and cc.otp_expires else None,
        'addresses': [{'id': a.id, 'nombre': a.nombre, 'direccion': a.direccion_completa, 'validada': a.validada} for a in addresses],
        'total_orders': len(orders),
    }


@router.put('/admin/users/{user_id}/edit')
def edit_user(
    user_id: int,
    req: UpdateUserReq,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, 'Usuario no encontrado')
    if req.nombre: user.nombre = req.nombre
    if req.empresa: user.empresa = req.empresa
    if req.cif: user.cif = req.cif
    if req.telefono: user.telefono = req.telefono
    if req.direccion: user.direccion = req.direccion
    if req.email: user.email = req.email.lower()
    db.commit()
    return {'ok': True}


@router.post('/admin/users/{user_id}/send-contract')
def send_contract(
    user_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    import random
    from datetime import timedelta

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, 'Usuario no encontrado')

    active_contract = db.query(models.Contract).filter(models.Contract.activo == True).first()
    if not active_contract:
        raise HTTPException(400, 'No hay contrato activo. Sube un contrato en la sección Contratos.')

    otp = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(hours=48)

    cc = db.query(models.ClientContract).filter(
        models.ClientContract.user_id == user_id,
        models.ClientContract.contract_id == active_contract.id
    ).first()
    if not cc:
        cc = models.ClientContract(user_id=user_id, contract_id=active_contract.id)
        db.add(cc)

    cc.otp_code = otp
    cc.otp_expires = expires
    cc.firmado = False
    db.commit()

    print(f'[CONTRACT OTP] Usuario {user.email}: OTP={otp}, expira={expires}')

    return {
        'ok': True,
        'mensaje': f'Contrato enviado a {user.email}',
        'otp_preview': otp,
        'contract_url': active_contract.archivo_url,
        'expires_at': expires.isoformat()
    }


class AdminCreateUser(BaseModel):
    nombre: str
    email: str
    empresa: Optional[str] = None
    cif: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    password: Optional[str] = 'Rentally2025!'


@router.post('/admin/users')
def admin_create_user(
    req: AdminCreateUser,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    from passlib.context import CryptContext
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail='Ya existe un usuario con ese email')
    pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
    user = models.User(
        nombre=req.nombre,
        email=req.email,
        password_hash=hashlib.sha256((req.password or "Rentally2025!").encode()).hexdigest(),
        empresa=req.empresa,
        cif=req.cif,
        telefono=req.telefono,
        direccion=req.direccion,
        estado='aprobado',
        email_verified=True,
        role='client'
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {'id': user.id, 'message': 'Cliente creado correctamente'}


class AdminCreateStaff(BaseModel):
    nombre: str
    email: str
    password: str


@router.post('/admin/staff')
def create_staff(
    req: AdminCreateStaff,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    # Solo admin puede crear staff (no staff)
    if current_user.rol != 'admin':
        raise HTTPException(403, 'Solo el admin puede crear usuarios staff')
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(400, 'Ya existe un usuario con ese email')
    import hashlib
    user = models.User(
        nombre=req.nombre,
        email=req.email,
        password_hash=hashlib.sha256(req.password.encode()).hexdigest(),
        estado='aprobado',
        email_verified=True,
        rol='staff'
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {'id': user.id, 'message': 'Usuario staff creado'}


@router.get('/admin/staff')
def list_staff(
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    staff = db.query(models.User).filter(models.User.rol == 'staff').all()
    return [{'id': u.id, 'nombre': u.nombre, 'email': u.email} for u in staff]


@router.delete('/admin/staff/{user_id}')
def delete_staff(
    user_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    if current_user.rol != 'admin':
        raise HTTPException(403, 'Solo el admin puede eliminar usuarios staff')
    user = db.query(models.User).filter(models.User.id == user_id, models.User.rol == 'staff').first()
    if not user:
        raise HTTPException(404, 'Usuario no encontrado')
    db.delete(user)
    db.commit()
    return {'message': 'Usuario staff eliminado'}
