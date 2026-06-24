from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    alertas, auth, clientes, comunicados, documentos,
    expediente, pedidos, productos, reportes, uploads, vendedores,
)

app = FastAPI(title="CevicheSeguro API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vendedores.router)
app.include_router(clientes.router)
app.include_router(documentos.router)
app.include_router(productos.router)
app.include_router(pedidos.router)
app.include_router(reportes.router)
app.include_router(alertas.router)
app.include_router(expediente.router)
app.include_router(comunicados.router)
app.include_router(uploads.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
