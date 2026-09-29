from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from seed import seed
from routers import auth, admin, analyst, developer, demo


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    seed()
    yield
    # Shutdown (nothing to clean up)


app = FastAPI(
    title="World Monitor Guard — DevSecOps Platform",
    description="Production-grade API security evaluation platform with RBAC, AI triage, and automated verification lifecycle.",
    version="2.4.1",
    lifespan=lifespan,
)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(analyst.router)
app.include_router(developer.router)
app.include_router(demo.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "World Monitor Guard", "version": "2.4.1"}

