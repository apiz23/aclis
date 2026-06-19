from fastapi import FastAPI

app = FastAPI(title="ACLIS API")

@app.get("/health")
def health():
    return {"status": "ok"}
