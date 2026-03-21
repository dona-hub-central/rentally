from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from database import get_db
import models
import auth as auth_module
import os, shutil

router = APIRouter()

CONTRACTS_DIR = "/opt/projects/rentally/backend/uploads/contracts"


@router.get("/contracts/current")
def get_current_contract(
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    contract = db.query(models.Contract).filter(models.Contract.activo == True).first()
    if not contract:
        return {"contract": None}

    return {
        "id": contract.id,
        "nombre": contract.nombre,
        "archivo_url": contract.archivo_url,
        "version": contract.version,
        "activo": contract.activo
    }


@router.get("/contracts/my-status")
def get_my_contract_status(
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    contract = db.query(models.Contract).filter(models.Contract.activo == True).first()
    if not contract:
        return {"has_contract": False, "firmado": False}

    cc = db.query(models.ClientContract).filter(
        models.ClientContract.user_id == current_user.id,
        models.ClientContract.contract_id == contract.id
    ).first()

    return {
        "has_contract": True,
        "contract_id": contract.id,
        "contract_nombre": contract.nombre,
        "firmado": cc.firmado if cc else False,
        "firma_timestamp": cc.firma_timestamp if cc else None
    }


@router.post("/admin/contracts")
async def upload_contract(
    nombre: str = Form(...),
    version: str = Form(None),
    archivo: UploadFile = File(...),
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    # Validate file type
    if not archivo.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")

    # Save file
    os.makedirs(CONTRACTS_DIR, exist_ok=True)
    filename = f"contract_{nombre.replace(' ', '_')}_{version or 'v1'}.pdf"
    filepath = os.path.join(CONTRACTS_DIR, filename)

    with open(filepath, "wb") as f:
        content = await archivo.read()
        f.write(content)

    archivo_url = f"/api/uploads/contracts/{filename}"

    # Deactivate previous contracts
    db.query(models.Contract).filter(models.Contract.activo == True).update({"activo": False})

    # Create new contract
    contract = models.Contract(
        nombre=nombre,
        archivo_url=archivo_url,
        version=version,
        activo=True
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    return {
        "id": contract.id,
        "nombre": contract.nombre,
        "archivo_url": contract.archivo_url,
        "version": contract.version
    }


@router.get("/admin/contracts")
def get_all_contracts(
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    contracts = db.query(models.Contract).order_by(models.Contract.created_at.desc()).all()
    result = []
    for c in contracts:
        signatures_count = db.query(models.ClientContract).filter(
            models.ClientContract.contract_id == c.id,
            models.ClientContract.firmado == True
        ).count()
        result.append({
            "id": c.id,
            "nombre": c.nombre,
            "archivo_url": c.archivo_url,
            "version": c.version,
            "activo": c.activo,
            "created_at": c.created_at,
            "firmas": signatures_count
        })
    return result
