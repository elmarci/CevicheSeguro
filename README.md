# CevicheSeguro

Sistema de trazabilidad y verificación sanitaria para vendedores ambulantes de ceviche de pota.

## Levantar localmente

```bash
cp .env.example .env
docker-compose up --build
```

- API: http://localhost:8000
- Docs interactivos: http://localhost:8000/docs
- Frontend: http://localhost:5173

## Variables de entorno

Ver `.env.example` para todas las variables requeridas.

## Estructura

```
/backend   FastAPI + SQLAlchemy + Alembic
/frontend  React + Vite
```

## Fases implementadas

- [x] Fase 1: Estructura, modelos, auth JWT (HU01, HU02)
- [ ] Fase 2: Licencias y certificados (HU03–HU06)
- [ ] Fase 3: Productos y pedidos (HU07–HU10)
- [ ] Fase 4: Reportes y alertas (HU11–HU13)
- [ ] Fase 5: Frontend completo
- [ ] Fase 6: CI/CD y Railway
