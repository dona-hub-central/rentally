from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db
import models
import auth as auth_module
from utils.email import generate_otp, send_otp_email

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    nombre: str
    empresa: Optional[str] = None
    cif: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    email: str
    otp: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ResendOTPRequest(BaseModel):
    email: str


class RequestContractOTPRequest(BaseModel):
    contract_id: int


class SignContractRequest(BaseModel):
    contract_id: int
    otp: str


@router.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(models.User).filter(models.User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Create user
    otp = generate_otp()
    otp_expires = datetime.utcnow() + timedelta(minutes=10)

    user = models.User(
        email=req.email.lower(),
        password_hash=auth_module.get_password_hash(req.password),
        nombre=req.nombre,
        empresa=req.empresa,
        cif=req.cif,
        telefono=req.telefono,
        direccion=req.direccion,
        rol="cliente",
        estado="pendiente",
        email_verified=False,
        otp_code=otp,
        otp_expires=otp_expires
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send OTP email
    send_otp_email(req.email, otp, db, purpose="verificacion")

    return {
        "message": "Registro exitoso. Revisa tu email para el código de verificación.",
        "user_id": user.id
    }


@router.post("/auth/verify-email")
def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.email_verified:
        return {"message": "Email ya verificado"}

    if not user.otp_code or user.otp_code != req.otp:
        raise HTTPException(status_code=400, detail="Código OTP inválido")

    if user.otp_expires and datetime.utcnow() > user.otp_expires:
        raise HTTPException(status_code=400, detail="El código OTP ha expirado")

    user.email_verified = True
    user.estado = "verificado"
    user.otp_code = None
    user.otp_expires = None
    db.commit()

    return {"message": "Email verificado correctamente. Esperando aprobación del administrador."}


@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email.lower()).first()
    if not user or not auth_module.verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    if user.estado == "bloqueado":
        raise HTTPException(status_code=403, detail="Cuenta bloqueada. Contacta con soporte.")

    token = auth_module.create_access_token({"sub": str(user.id)})

    # Check contract status
    has_signed_contract = False
    active_contract = db.query(models.Contract).filter(models.Contract.activo == True).first()
    if active_contract:
        client_contract = db.query(models.ClientContract).filter(
            models.ClientContract.user_id == user.id,
            models.ClientContract.contract_id == active_contract.id,
            models.ClientContract.firmado == True
        ).first()
        has_signed_contract = client_contract is not None

    # Check fianza
    fianza = db.query(models.Fianza).filter(
        models.Fianza.user_id == user.id,
        models.Fianza.confirmada == True
    ).first()
    has_fianza = fianza is not None

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "rol": user.rol,
            "nombre": user.nombre,
            "empresa": user.empresa,
            "estado": user.estado,
            "email_verified": user.email_verified,
            "has_signed_contract": has_signed_contract,
            "has_fianza": has_fianza
        }
    }


@router.get("/auth/me")
def me(current_user: models.User = Depends(auth_module.get_current_user), db: Session = Depends(get_db)):
    has_signed_contract = False
    active_contract = db.query(models.Contract).filter(models.Contract.activo == True).first()
    if active_contract:
        client_contract = db.query(models.ClientContract).filter(
            models.ClientContract.user_id == current_user.id,
            models.ClientContract.contract_id == active_contract.id,
            models.ClientContract.firmado == True
        ).first()
        has_signed_contract = client_contract is not None

    fianza = db.query(models.Fianza).filter(
        models.Fianza.user_id == current_user.id,
        models.Fianza.confirmada == True
    ).first()
    has_fianza = fianza is not None

    return {
        "id": current_user.id,
        "email": current_user.email,
        "rol": current_user.rol,
        "nombre": current_user.nombre,
        "empresa": current_user.empresa,
        "cif": current_user.cif,
        "telefono": current_user.telefono,
        "direccion": current_user.direccion,
        "estado": current_user.estado,
        "email_verified": current_user.email_verified,
        "has_signed_contract": has_signed_contract,
        "has_fianza": has_fianza,
        "created_at": current_user.created_at
    }


@router.post("/auth/resend-otp")
def resend_otp(req: ResendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.email_verified:
        return {"message": "Email ya verificado"}

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    send_otp_email(req.email, otp, db, purpose="verificacion")
    return {"message": "Código OTP reenviado"}


@router.post("/auth/request-contract-otp")
def request_contract_otp(
    req: RequestContractOTPRequest,
    request: Request,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.estado != "aprobado":
        raise HTTPException(status_code=403, detail="Cuenta no aprobada")

    contract = db.query(models.Contract).filter(
        models.Contract.id == req.contract_id,
        models.Contract.activo == True
    ).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    # Get or create ClientContract
    client_contract = db.query(models.ClientContract).filter(
        models.ClientContract.user_id == current_user.id,
        models.ClientContract.contract_id == req.contract_id
    ).first()

    otp = generate_otp()
    if not client_contract:
        client_contract = models.ClientContract(
            user_id=current_user.id,
            contract_id=req.contract_id,
            otp_code=otp,
            otp_expires=datetime.utcnow() + timedelta(minutes=10)
        )
        db.add(client_contract)
    else:
        client_contract.otp_code = otp
        client_contract.otp_expires = datetime.utcnow() + timedelta(minutes=10)

    db.commit()
    send_otp_email(current_user.email, otp, db, purpose="contrato")
    return {"message": "Código OTP enviado a tu email para firmar el contrato"}


@router.post("/auth/sign-contract")
def sign_contract(
    req: SignContractRequest,
    request: Request,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.estado != "aprobado":
        raise HTTPException(status_code=403, detail="Cuenta no aprobada")

    client_contract = db.query(models.ClientContract).filter(
        models.ClientContract.user_id == current_user.id,
        models.ClientContract.contract_id == req.contract_id
    ).first()

    if not client_contract:
        raise HTTPException(status_code=404, detail="No se encontró el contrato para firmar. Solicita el OTP primero.")

    if client_contract.firmado:
        return {"message": "Contrato ya firmado"}

    if not client_contract.otp_code or client_contract.otp_code != req.otp:
        raise HTTPException(status_code=400, detail="Código OTP inválido")

    if client_contract.otp_expires and datetime.utcnow() > client_contract.otp_expires:
        raise HTTPException(status_code=400, detail="El código OTP ha expirado")

    # Sign contract
    client_ip = request.client.host
    client_contract.firmado = True
    client_contract.firma_timestamp = datetime.utcnow()
    client_contract.firma_ip = client_ip
    client_contract.otp_code = None
    client_contract.otp_expires = None
    db.commit()

    return {"message": "Contrato firmado correctamente. Ahora el administrador confirmará la fianza."}
