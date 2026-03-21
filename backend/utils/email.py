import random
import string
from datetime import datetime
from sqlalchemy.orm import Session


def generate_otp() -> str:
    """Generate a 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=6))


def send_email(to: str, subject: str, html_body: str, db: Session = None):
    """
    Send email - currently logs to console and DB.
    When Resend API key is available, activate real sending.
    """
    print(f"\n{'='*60}")
    print(f"📧 EMAIL LOG")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print(f"Body: {html_body}")
    print(f"Time: {datetime.utcnow()}")
    print(f"{'='*60}\n")

    # Save to DB if session provided
    if db:
        try:
            from models import EmailLog
            log = EmailLog(
                to_email=to,
                subject=subject,
                html_body=html_body,
                status="logged"
            )
            db.add(log)
            db.commit()
        except Exception as e:
            print(f"Error saving email log: {e}")

    # TODO: Activate when Resend API key is available
    # import httpx
    # response = httpx.post(
    #     "https://api.resend.com/emails",
    #     headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
    #     json={"from": "Rentally <noreply@rentally.es>", "to": to, "subject": subject, "html": html_body}
    # )


def send_otp_email(to: str, otp: str, db: Session = None, purpose: str = "verificacion"):
    subject = "Tu código de verificación - Rentally"
    if purpose == "contrato":
        subject = "Tu código para firmar el contrato - Rentally"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Rentally</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Tu código de verificación</h2>
            <p style="color: #6b7280;">Usa el siguiente código para {'verificar tu email' if purpose == 'verificacion' else 'firmar tu contrato'}:</p>
            <div style="background: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">{otp}</span>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">Este código expira en 10 minutos. No lo compartas con nadie.</p>
        </div>
    </div>
    """
    send_email(to, subject, html_body, db)


def send_welcome_email(to: str, nombre: str, db: Session = None):
    subject = "Bienvenido a Rentally"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Rentally</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">¡Bienvenido, {nombre}!</h2>
            <p style="color: #6b7280;">Tu cuenta ha sido aprobada. Ya puedes acceder a la plataforma y realizar pedidos.</p>
            <a href="https://rentally.es/app" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px;">
                Ir a la plataforma
            </a>
        </div>
    </div>
    """
    send_email(to, subject, html_body, db)


def send_order_confirmation(to: str, nombre: str, order_id: int, total: float, db: Session = None):
    subject = f"Pedido #{order_id} confirmado - Rentally"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Rentally</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Pedido #{order_id} confirmado</h2>
            <p style="color: #6b7280;">Hola {nombre}, tu pedido ha sido recibido y está siendo procesado.</p>
            <p style="color: #1f2937;"><strong>Total: {total:.2f}€</strong></p>
            <a href="https://rentally.es/app/orders/{order_id}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px;">
                Ver pedido
            </a>
        </div>
    </div>
    """
    send_email(to, subject, html_body, db)
