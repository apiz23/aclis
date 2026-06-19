from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import me
from app.config import settings

app = FastAPI(title="ACLIS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)

@app.get("/health")
def health():
    return {"status": "ok"}
