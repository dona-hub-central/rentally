from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from database import get_db
import models
import auth as auth_module

router = APIRouter()

# Stripe test key - replace with real key when ready
STRIPE_SECRET_KEY = "sk_test_placeholder_configure_real_key"
STRIPE_WEBHOOK_SECRET = "whsec_placeholder"


class CreatePaymentIntentRequest(BaseModel):
    order_id: int


class TransferNotifyRequest(BaseModel):
    order_id: int
    notas: Optional[str] = None


@router.post("/payments/stripe/create-intent")
def create_stripe_intent(
    req: CreatePaymentIntentRequest,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(
        models.Order.id == req.order_id,
        models.Order.user_id == current_user.id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # TODO: Activate when Stripe is configured
    # import stripe
    # stripe.api_key = STRIPE_SECRET_KEY
    # intent = stripe.PaymentIntent.create(
    #     amount=int(order.total * 100),  # cents
    #     currency="eur",
    #     metadata={"order_id": order.id, "user_id": current_user.id}
    # )

    # For now, create a mock payment intent
    mock_intent_id = f"pi_test_{order.id}_{int(datetime.utcnow().timestamp())}"

    payment = db.query(models.Payment).filter(models.Payment.order_id == order.id).first()
    if not payment:
        payment = models.Payment(
            order_id=order.id,
            metodo="stripe",
            estado="pendiente",
            importe=order.total,
            stripe_payment_intent=mock_intent_id
        )
        db.add(payment)
    else:
        payment.metodo = "stripe"
        payment.stripe_payment_intent = mock_intent_id

    db.commit()

    return {
        "client_secret": f"{mock_intent_id}_secret",
        "payment_intent_id": mock_intent_id,
        "importe": order.total,
        "message": "Stripe en modo placeholder. Configura las claves reales para procesar pagos."
    }


@router.post("/payments/stripe/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    # TODO: Implement real Stripe webhook verification
    payload = await request.body()

    # Mock handling for now
    return {"status": "received"}


@router.post("/payments/transfer/notify")
def notify_transfer(
    req: TransferNotifyRequest,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(
        models.Order.id == req.order_id,
        models.Order.user_id == current_user.id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    payment = db.query(models.Payment).filter(models.Payment.order_id == order.id).first()
    if not payment:
        payment = models.Payment(
            order_id=order.id,
            metodo="transferencia",
            estado="pendiente",
            importe=order.total
        )
        db.add(payment)
    else:
        payment.metodo = "transferencia"
        payment.estado = "pendiente"
        if req.notas:
            # Store notes in payment - add a notes field would be ideal
            pass

    db.commit()

    return {
        "message": "Notificación de transferencia enviada. El administrador confirmará el pago.",
        "order_id": order.id,
        "importe": order.total
    }
