from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
import models
import auth as auth_module
from utils.email import send_order_confirmation

router = APIRouter()

PRECIOS_TRANSPORTE = {
    "ninguno": 0.0,
    "ida": 15.0,
    "ida_vuelta": 25.0
}


class OrderItemRequest(BaseModel):
    product_id: int
    cantidad: int


class CreateOrderRequest(BaseModel):
    address_id: int
    items: List[OrderItemRequest]
    tipo_transporte: Optional[str] = "ninguno"
    metodo_pago: Optional[str] = "transferencia"
    notas: Optional[str] = None


@router.get("/orders")
def get_my_orders(
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    orders = db.query(models.Order).filter(
        models.Order.user_id == current_user.id
    ).order_by(models.Order.created_at.desc()).all()

    result = []
    for o in orders:
        items = db.query(models.OrderItem).filter(models.OrderItem.order_id == o.id).all()
        items_detail = []
        for item in items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            items_detail.append({
                "id": item.id,
                "product_id": item.product_id,
                "product_nombre": product.nombre if product else "Desconocido",
                "product_imagen": product.imagen_url if product else None,
                "cantidad": item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal": item.subtotal
            })

        address = db.query(models.Address).filter(models.Address.id == o.address_id).first()
        payment = db.query(models.Payment).filter(models.Payment.order_id == o.id).first()
        flags = db.query(models.OrderFlag).filter(models.OrderFlag.order_id == o.id, models.OrderFlag.resuelto == False).all()

        result.append({
            "id": o.id,
            "estado": o.estado,
            "tipo_transporte": o.tipo_transporte,
            "precio_transporte": o.precio_transporte,
            "subtotal": o.subtotal,
            "total": o.total,
            "notas": o.notas,
            "created_at": o.created_at,
            "updated_at": o.updated_at,
            "address": {
                "id": address.id,
                "nombre": address.nombre,
                "direccion_completa": address.direccion_completa
            } if address else None,
            "items": items_detail,
            "payment": {
                "metodo": payment.metodo,
                "estado": payment.estado
            } if payment else None,
            "flags": [{"motivo": f.motivo} for f in flags]
        })
    return result


@router.post("/orders")
def create_order(
    req: CreateOrderRequest,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    # Check user can order
    if not current_user.email_verified:
        raise HTTPException(status_code=403, detail="Email no verificado")
    if current_user.estado != "aprobado":
        raise HTTPException(status_code=403, detail="Cuenta no aprobada")

    # Check contract
    active_contract = db.query(models.Contract).filter(models.Contract.activo == True).first()
    if active_contract:
        cc = db.query(models.ClientContract).filter(
            models.ClientContract.user_id == current_user.id,
            models.ClientContract.contract_id == active_contract.id,
            models.ClientContract.firmado == True
        ).first()
        if not cc:
            raise HTTPException(status_code=403, detail="Debes firmar el contrato antes de pedir")

    # Check fianza
    fianza = db.query(models.Fianza).filter(
        models.Fianza.user_id == current_user.id,
        models.Fianza.confirmada == True
    ).first()
    if not fianza:
        raise HTTPException(status_code=403, detail="La fianza no ha sido confirmada")

    # Check address
    address = db.query(models.Address).filter(
        models.Address.id == req.address_id,
        models.Address.user_id == current_user.id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Dirección no encontrada")
    if not address.validada:
        raise HTTPException(status_code=400, detail="La dirección no está validada. Espera la validación del administrador.")

    # Validate items and calculate totals
    if not req.items:
        raise HTTPException(status_code=400, detail="El pedido debe tener al menos un producto")

    subtotal = 0.0
    order_items_data = []
    needs_flag = False

    for item_req in req.items:
        product = db.query(models.Product).filter(
            models.Product.id == item_req.product_id,
            models.Product.activo == True
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {item_req.product_id} no encontrado")

        if item_req.cantidad <= 0:
            raise HTTPException(status_code=400, detail=f"Cantidad inválida para {product.nombre}")

        item_subtotal = product.precio * item_req.cantidad
        subtotal += item_subtotal

        if item_req.cantidad > product.umbral_cantidad:
            needs_flag = True

        order_items_data.append({
            "product": product,
            "cantidad": item_req.cantidad,
            "precio_unitario": product.precio,
            "subtotal": item_subtotal
        })

    # Calculate transport
    tipo_transporte = req.tipo_transporte or "ninguno"
    if tipo_transporte not in PRECIOS_TRANSPORTE:
        tipo_transporte = "ninguno"
    precio_transporte = PRECIOS_TRANSPORTE[tipo_transporte]

    total = subtotal + precio_transporte

    # Determine order state
    estado = "pendiente" if needs_flag else "confirmado"

    # Create order
    order = models.Order(
        user_id=current_user.id,
        address_id=req.address_id,
        estado=estado,
        tipo_transporte=tipo_transporte,
        precio_transporte=precio_transporte,
        subtotal=subtotal,
        total=total,
        notas=req.notas
    )
    db.add(order)
    db.flush()

    # Create order items
    for item_data in order_items_data:
        order_item = models.OrderItem(
            order_id=order.id,
            product_id=item_data["product"].id,
            cantidad=item_data["cantidad"],
            precio_unitario=item_data["precio_unitario"],
            subtotal=item_data["subtotal"]
        )
        db.add(order_item)

    # Create flags if needed
    if needs_flag:
        flag = models.OrderFlag(
            order_id=order.id,
            motivo="supera_umbral"
        )
        db.add(flag)

    # Create payment record
    payment = models.Payment(
        order_id=order.id,
        metodo=req.metodo_pago or "transferencia",
        estado="pendiente",
        importe=total
    )
    db.add(payment)

    db.commit()
    db.refresh(order)

    # Send confirmation email
    send_order_confirmation(current_user.email, current_user.nombre, order.id, total, db)

    return {
        "id": order.id,
        "estado": order.estado,
        "subtotal": order.subtotal,
        "precio_transporte": order.precio_transporte,
        "total": order.total,
        "message": "Pedido creado. Requiere validación del administrador." if needs_flag else "Pedido confirmado correctamente."
    }


@router.get("/orders/{order_id}")
def get_order(
    order_id: int,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Order).filter(models.Order.id == order_id)
    if current_user.rol != "admin":
        query = query.filter(models.Order.user_id == current_user.id)

    order = query.first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).all()
    items_detail = []
    for item in items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        items_detail.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_nombre": product.nombre if product else "Desconocido",
            "product_imagen": product.imagen_url if product else None,
            "cantidad": item.cantidad,
            "precio_unitario": item.precio_unitario,
            "subtotal": item.subtotal
        })

    address = db.query(models.Address).filter(models.Address.id == order.address_id).first()
    payment = db.query(models.Payment).filter(models.Payment.order_id == order.id).first()
    flags = db.query(models.OrderFlag).filter(models.OrderFlag.order_id == order.id).all()
    user = db.query(models.User).filter(models.User.id == order.user_id).first()

    return {
        "id": order.id,
        "user_nombre": user.nombre if user else "Desconocido",
        "estado": order.estado,
        "tipo_transporte": order.tipo_transporte,
        "precio_transporte": order.precio_transporte,
        "subtotal": order.subtotal,
        "total": order.total,
        "notas": order.notas,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "address": {
            "nombre": address.nombre,
            "direccion_completa": address.direccion_completa,
            "ciudad": address.ciudad,
            "cp": address.cp
        } if address else None,
        "items": items_detail,
        "payment": {
            "metodo": payment.metodo,
            "estado": payment.estado,
            "importe": payment.importe
        } if payment else None,
        "flags": [{"id": f.id, "motivo": f.motivo, "resuelto": f.resuelto} for f in flags]
    }


@router.put("/orders/{order_id}/cancel")
def cancel_order(
    order_id: int,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == current_user.id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if order.estado not in ["borrador", "pendiente"]:
        raise HTTPException(status_code=400, detail="Solo se pueden cancelar pedidos en estado borrador o pendiente")

    order.estado = "cancelado"
    order.updated_at = datetime.utcnow()
    db.commit()

    return {"message": f"Pedido #{order_id} cancelado"}
