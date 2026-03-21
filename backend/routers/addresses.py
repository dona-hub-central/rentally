from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
import models
import auth as auth_module

router = APIRouter()


class AddressCreate(BaseModel):
    nombre: str
    direccion_completa: str
    ciudad: Optional[str] = "Madrid"
    cp: Optional[str] = None


@router.get("/addresses")
def get_addresses(
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    addresses = db.query(models.Address).filter(
        models.Address.user_id == current_user.id
    ).all()

    return [{
        "id": a.id,
        "nombre": a.nombre,
        "direccion_completa": a.direccion_completa,
        "ciudad": a.ciudad,
        "cp": a.cp,
        "validada": a.validada,
        "validada_at": a.validada_at
    } for a in addresses]


@router.post("/addresses")
def create_address(
    req: AddressCreate,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    address = models.Address(
        user_id=current_user.id,
        nombre=req.nombre,
        direccion_completa=req.direccion_completa,
        ciudad=req.ciudad or "Madrid",
        cp=req.cp,
        validada=False
    )
    db.add(address)
    db.commit()
    db.refresh(address)

    return {
        "id": address.id,
        "nombre": address.nombre,
        "direccion_completa": address.direccion_completa,
        "ciudad": address.ciudad,
        "cp": address.cp,
        "validada": address.validada,
        "message": "Dirección añadida. Pendiente de validación por el administrador."
    }


@router.delete("/addresses/{address_id}")
def delete_address(
    address_id: int,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    address = db.query(models.Address).filter(
        models.Address.id == address_id,
        models.Address.user_id == current_user.id
    ).first()

    if not address:
        raise HTTPException(status_code=404, detail="Dirección no encontrada")

    # Check if used in pending orders
    active_orders = db.query(models.Order).filter(
        models.Order.address_id == address_id,
        models.Order.estado.in_(["pendiente", "confirmado", "en_preparacion"])
    ).count()

    if active_orders > 0:
        raise HTTPException(status_code=400, detail="No se puede eliminar una dirección con pedidos activos")

    db.delete(address)
    db.commit()
    return {"message": "Dirección eliminada"}
