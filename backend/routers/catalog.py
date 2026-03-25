from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from database import get_db
import models
import auth as auth_module

router = APIRouter()


class CategoryCreate(BaseModel):
    nombre: str
    icono: Optional[str] = None
    orden: Optional[int] = 0


class ProductCreate(BaseModel):
    category_id: int
    nombre: str
    descripcion: Optional[str] = None
    precio: float
    imagen_url: Optional[str] = None
    activo: Optional[bool] = True
    umbral_cantidad: Optional[int] = 100
    stock_disponible: Optional[int] = 0


class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    imagen_url: Optional[str] = None
    activo: Optional[bool] = None
    umbral_cantidad: Optional[int] = None
    stock_disponible: Optional[int] = None


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).order_by(models.Category.orden).all()
    return [{"id": c.id, "nombre": c.nombre, "icono": c.icono, "orden": c.orden} for c in categories]


@router.get("/products")
def get_products(
    category_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Product).filter(models.Product.activo == True)
    if category_id:
        query = query.filter(models.Product.category_id == category_id)

    products = query.all()
    result = []
    for p in products:
        images = db.query(models.ProductImage).filter(
            models.ProductImage.product_id == p.id
        ).order_by(models.ProductImage.orden).all()

        result.append({
            "id": p.id,
            "category_id": p.category_id,
            "nombre": p.nombre,
            "descripcion": p.descripcion,
            "precio": p.precio,
            "imagen_url": p.imagen_url,
            "activo": p.activo,
            "umbral_cantidad": p.umbral_cantidad,
            "stock_disponible": p.stock_disponible,
            "images": [{"id": img.id, "imagen_url": img.imagen_url, "orden": img.orden} for img in images]
        })
    return result


@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    images = db.query(models.ProductImage).filter(
        models.ProductImage.product_id == product_id
    ).order_by(models.ProductImage.orden).all()

    category = db.query(models.Category).filter(models.Category.id == product.category_id).first()

    return {
        "id": product.id,
        "category_id": product.category_id,
        "category_nombre": category.nombre if category else None,
        "nombre": product.nombre,
        "descripcion": product.descripcion,
        "precio": product.precio,
        "imagen_url": product.imagen_url,
        "activo": product.activo,
        "umbral_cantidad": product.umbral_cantidad,
        "stock_disponible": product.stock_disponible,
        "images": [{"id": img.id, "imagen_url": img.imagen_url, "orden": img.orden} for img in images]
    }


@router.post("/admin/categories")
def create_category(
    req: CategoryCreate,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    category = models.Category(
        nombre=req.nombre,
        icono=req.icono,
        orden=req.orden or 0
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return {"id": category.id, "nombre": category.nombre, "icono": category.icono, "orden": category.orden}


@router.post("/admin/products")
def create_product(
    req: ProductCreate,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    category = db.query(models.Category).filter(models.Category.id == req.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    product = models.Product(
        category_id=req.category_id,
        nombre=req.nombre,
        descripcion=req.descripcion,
        precio=req.precio,
        imagen_url=req.imagen_url,
        activo=req.activo if req.activo is not None else True,
        umbral_cantidad=req.umbral_cantidad or 100,
        stock_disponible=req.stock_disponible or 0
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"id": product.id, "nombre": product.nombre, "precio": product.precio}


@router.put("/admin/products/{product_id}")
def update_product(
    product_id: int,
    req: ProductUpdate,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if req.category_id is not None:
        product.category_id = req.category_id
    if req.nombre is not None:
        product.nombre = req.nombre
    if req.descripcion is not None:
        product.descripcion = req.descripcion
    if req.precio is not None:
        product.precio = req.precio
    if req.imagen_url is not None:
        product.imagen_url = req.imagen_url
    if req.activo is not None:
        product.activo = req.activo
    if req.umbral_cantidad is not None:
        product.umbral_cantidad = req.umbral_cantidad
    if req.stock_disponible is not None:
        product.stock_disponible = req.stock_disponible

    db.commit()
    db.refresh(product)
    return {"message": "Producto actualizado", "id": product.id}


@router.delete("/admin/products/{product_id}")
def delete_product(
    product_id: int,
    current_user: models.User = Depends(auth_module.require_admin),
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    product.activo = False
    db.commit()
    return {"message": f"Producto '{product.nombre}' desactivado"}


# ── KITS ──────────────────────────────────────────────────────

class KitItemIn(BaseModel):
    product_id: int
    cantidad: int = 1

class KitCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio: float = 0
    imagen_url: Optional[str] = None
    items: List[KitItemIn] = []

class KitUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    imagen_url: Optional[str] = None
    activo: Optional[bool] = None
    items: Optional[List[KitItemIn]] = None


def kit_to_dict(k, db):
    items = []
    for i in k.items:
        p = db.query(models.Product).filter(models.Product.id == i.product_id).first()
        items.append({
            'id': i.id,
            'product_id': i.product_id,
            'product_nombre': p.nombre if p else '',
            'product_imagen': p.imagen_url if p else None,
            'cantidad': i.cantidad
        })
    return {
        'id': k.id,
        'nombre': k.nombre,
        'descripcion': k.descripcion,
        'precio': k.precio,
        'imagen_url': k.imagen_url,
        'activo': k.activo,
        'items': items
    }


@router.get('/kits')
def get_kits(db: Session = Depends(get_db)):
    kits = db.query(models.Kit).filter(models.Kit.activo == True).all()
    return [kit_to_dict(k, db) for k in kits]


@router.get('/admin/kits')
def admin_get_kits(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_module.require_admin)
):
    kits = db.query(models.Kit).order_by(models.Kit.id.desc()).all()
    return [kit_to_dict(k, db) for k in kits]


@router.post('/admin/kits')
def create_kit(
    req: KitCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_module.require_admin)
):
    kit = models.Kit(
        nombre=req.nombre,
        descripcion=req.descripcion,
        precio=req.precio,
        imagen_url=req.imagen_url
    )
    db.add(kit)
    db.flush()
    for item in req.items:
        db.add(models.KitItem(kit_id=kit.id, product_id=item.product_id, cantidad=item.cantidad))
    db.commit()
    db.refresh(kit)
    return kit_to_dict(kit, db)


@router.put('/admin/kits/{kit_id}')
def update_kit(
    kit_id: int,
    req: KitUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_module.require_admin)
):
    kit = db.query(models.Kit).filter(models.Kit.id == kit_id).first()
    if not kit:
        raise HTTPException(404, 'Kit no encontrado')
    if req.nombre is not None: kit.nombre = req.nombre
    if req.descripcion is not None: kit.descripcion = req.descripcion
    if req.precio is not None: kit.precio = req.precio
    if req.imagen_url is not None: kit.imagen_url = req.imagen_url
    if req.activo is not None: kit.activo = req.activo
    if req.items is not None:
        db.query(models.KitItem).filter(models.KitItem.kit_id == kit_id).delete()
        for item in req.items:
            db.add(models.KitItem(kit_id=kit_id, product_id=item.product_id, cantidad=item.cantidad))
    db.commit()
    db.refresh(kit)
    return kit_to_dict(kit, db)


@router.delete('/admin/kits/{kit_id}')
def delete_kit(
    kit_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_module.require_admin)
):
    kit = db.query(models.Kit).filter(models.Kit.id == kit_id).first()
    if not kit:
        raise HTTPException(404, 'Kit no encontrado')
    kit.activo = False
    db.commit()
    return {'message': 'Kit desactivado'}
