from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os

from database import engine, SessionLocal
import models

# Import routers
from routers import auth as auth_router
from routers import admin as admin_router
from routers import catalog as catalog_router
from routers import orders as orders_router
from routers import contracts as contracts_router
from routers import addresses as addresses_router
from routers import payments as payments_router
from routers import uploads as uploads_router

# Create tables
models.Base.metadata.create_all(bind=engine)

# Create app
app = FastAPI(
    title="Rentally API",
    description="Sistema de gestión de pedidos de lencería y amenities para apartamentos turísticos",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
uploads_dir = "/opt/projects/rentally/backend/uploads"
os.makedirs(uploads_dir, exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "contracts"), exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "fianzas"), exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "images"), exist_ok=True)

app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include routers
app.include_router(auth_router.router, prefix="/api")
app.include_router(admin_router.router, prefix="/api")
app.include_router(catalog_router.router, prefix="/api")
app.include_router(orders_router.router, prefix="/api")
app.include_router(contracts_router.router, prefix="/api")
app.include_router(addresses_router.router, prefix="/api")
app.include_router(payments_router.router, prefix="/api")
app.include_router(uploads_router.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Rentally API", "version": "1.0.0"}


@app.on_event("startup")
def seed_database():
    """Create admin user on startup if not exists."""
    db: Session = SessionLocal()
    try:
        from auth import get_password_hash

        admin = db.query(models.User).filter(models.User.email == "admin@rentally.es").first()
        if not admin:
            admin = models.User(
                email="admin@rentally.es",
                password_hash=get_password_hash("rentally2026admin"),
                nombre="Administrador Rentally",
                empresa="Rentally",
                rol="admin",
                estado="aprobado",
                email_verified=True
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created: admin@rentally.es / rentally2026admin")
        else:
            print("✅ Admin user already exists")

        # Seed some sample categories and products
        if db.query(models.Category).count() == 0:
            categories_data = [
                {"nombre": "Lencería de Cama", "icono": "🛏️", "orden": 1},
                {"nombre": "Toallas y Baño", "icono": "🛁", "orden": 2},
                {"nombre": "Amenities", "icono": "🧴", "orden": 3},
                {"nombre": "Cocina", "icono": "🍳", "orden": 4},
            ]
            cats = []
            for cat_data in categories_data:
                cat = models.Category(**cat_data)
                db.add(cat)
                cats.append(cat)
            db.flush()

            products_data = [
                {"category_idx": 0, "nombre": "Sábana bajera 90cm", "precio": 8.50, "umbral_cantidad": 20},
                {"category_idx": 0, "nombre": "Sábana bajera 150cm", "precio": 12.00, "umbral_cantidad": 20},
                {"category_idx": 0, "nombre": "Funda nórdica 90cm", "precio": 15.00, "umbral_cantidad": 10},
                {"category_idx": 0, "nombre": "Funda nórdica 150cm", "precio": 20.00, "umbral_cantidad": 10},
                {"category_idx": 1, "nombre": "Toalla de baño 70x140", "precio": 6.00, "umbral_cantidad": 30},
                {"category_idx": 1, "nombre": "Toalla de manos 50x100", "precio": 3.50, "umbral_cantidad": 30},
                {"category_idx": 2, "nombre": "Kit amenities completo", "precio": 4.50, "umbral_cantidad": 50},
                {"category_idx": 2, "nombre": "Gel de ducha 30ml", "precio": 0.80, "umbral_cantidad": 100},
                {"category_idx": 2, "nombre": "Champú 30ml", "precio": 0.80, "umbral_cantidad": 100},
                {"category_idx": 3, "nombre": "Kit café", "precio": 2.50, "umbral_cantidad": 50},
            ]

            for p_data in products_data:
                cat_idx = p_data.pop("category_idx")
                product = models.Product(
                    category_id=cats[cat_idx].id,
                    descripcion=f"Producto de calidad para apartamentos turísticos",
                    activo=True,
                    stock_disponible=500,
                    **p_data
                )
                db.add(product)

            db.commit()
            print("✅ Sample categories and products created")

    except Exception as e:
        print(f"❌ Error in seed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8091, reload=False)
