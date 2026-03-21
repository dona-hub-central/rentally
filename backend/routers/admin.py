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
            "validada_at": a.validada_at
        })
    return result


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
