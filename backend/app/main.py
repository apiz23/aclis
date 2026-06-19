from fastapi import FastAPI
from app.routers import me

app = FastAPI(title="ACLIS API")
app.include_router(me.router)

@app.get("/health")
def health():
    return {"status": "ok"}
