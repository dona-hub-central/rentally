from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    nombre = Column(String, nullable=False)
    empresa = Column(String)
    cif = Column(String)
    telefono = Column(String)
    direccion = Column(String)
    rol = Column(String, default="cliente")
    estado = Column(String, default="pendiente")
    email_verified = Column(Boolean, default=False)
    otp_code = Column(String)
    otp_expires = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="user", foreign_keys="Order.user_id")
    addresses = relationship("Address", back_populates="user", foreign_keys="Address.user_id")
    client_contracts = relationship("ClientContract", back_populates="user")
    fianza = relationship("Fianza", back_populates="user", foreign_keys="Fianza.user_id", uselist=False)
    sub_users = relationship("SubUser", back_populates="parent_user")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    archivo_url = Column(String, nullable=False)
    version = Column(String)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client_contracts = relationship("ClientContract", back_populates="contract")


class ClientContract(Base):
    __tablename__ = "client_contracts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    firmado = Column(Boolean, default=False)
    otp_code = Column(String)
    otp_expires = Column(DateTime)
    firma_timestamp = Column(DateTime)
    firma_ip = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="client_contracts")
    contract = relationship("Contract", back_populates="client_contracts")


class Fianza(Base):
    __tablename__ = "fianzas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    confirmada = Column(Boolean, default=False)
    justificante_url = Column(String)
    confirmada_por = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmada_at = Column(DateTime)
    notas = Column(Text)
    exenta = Column(Boolean, default=False)

    user = relationship("User", back_populates="fianza", foreign_keys=[user_id])


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    icono = Column(String)
    orden = Column(Integer, default=0)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    nombre = Column(String, nullable=False)
    descripcion = Column(Text)
    precio = Column(Float, nullable=False)
    imagen_url = Column(String)
    activo = Column(Boolean, default=True)
    umbral_cantidad = Column(Integer, default=100)
    stock_disponible = Column(Integer, default=0)

    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    imagen_url = Column(String, nullable=False)
    orden = Column(Integer, default=0)

    product = relationship("Product", back_populates="images")


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    nombre = Column(String, nullable=False)
    direccion_completa = Column(String, nullable=False)
    ciudad = Column(String, default="Madrid")
    cp = Column(String)
    validada = Column(Boolean, default=False)
    validada_por = Column(Integer, ForeignKey("users.id"), nullable=True)
    validada_at = Column(DateTime)

    user = relationship("User", back_populates="addresses", foreign_keys=[user_id])
    orders = relationship("Order", back_populates="address")


class SubUser(Base):
    __tablename__ = "sub_users"

    id = Column(Integer, primary_key=True, index=True)
    parent_user_id = Column(Integer, ForeignKey("users.id"))
    email = Column(String, nullable=False)
    nombre = Column(String, nullable=False)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    parent_user = relationship("User", back_populates="sub_users")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    sub_user_id = Column(Integer, ForeignKey("sub_users.id"), nullable=True)
    address_id = Column(Integer, ForeignKey("addresses.id"))
    estado = Column(String, default="pendiente")
    tipo_transporte = Column(String, default="ninguno")
    precio_transporte = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    notas = Column(Text)
    exenta = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="orders", foreign_keys=[user_id])
    address = relationship("Address", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")
    flags = relationship("OrderFlag", back_populates="order")
    payment = relationship("Payment", back_populates="order", uselist=False)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class OrderFlag(Base):
    __tablename__ = "order_flags"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    motivo = Column(String)
    resuelto = Column(Boolean, default=False)
    resuelto_por = Column(Integer, ForeignKey("users.id"), nullable=True)
    resuelto_at = Column(DateTime)

    order = relationship("Order", back_populates="flags")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True)
    metodo = Column(String)
    estado = Column(String, default="pendiente")
    stripe_payment_intent = Column(String)
    importe = Column(Float)
    confirmado_por = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmado_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payment")


class ClientImport(Base):
    __tablename__ = "client_imports"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False)
    nombre = Column(String)
    empresa = Column(String)
    estado = Column(String, default="importado")
    created_at = Column(DateTime, default=datetime.utcnow)


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    to_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    html_body = Column(Text)
    sent_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="logged")


class Kit(Base):
    __tablename__ = 'kits'

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    descripcion = Column(String)
    precio = Column(Float, default=0)
    imagen_url = Column(String)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship('KitItem', back_populates='kit', cascade='all, delete-orphan')


class KitItem(Base):
    __tablename__ = 'kit_items'

    id = Column(Integer, primary_key=True, index=True)
    kit_id = Column(Integer, ForeignKey('kits.id'))
    product_id = Column(Integer, ForeignKey('products.id'))
    cantidad = Column(Integer, default=1)

    kit = relationship('Kit', back_populates='items')
    product = relationship('Product')
