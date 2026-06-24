from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import alertas, auth, clientes, documentos, pedidos, productos, reportes, vendedores

app = FastAPI(title="CevicheSeguro API", version="1.0.0")

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


@app.get("/health")
def health():
    return {"status": "ok"}
