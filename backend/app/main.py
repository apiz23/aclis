from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import me, stats, kampung, leaders, reports, issues, evaluations, residents
from app.config import settings

app = FastAPI(title="ACLIS API")

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in _SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(stats.router)
app.include_router(kampung.router)
app.include_router(leaders.router)
app.include_router(reports.router)
app.include_router(issues.router)
app.include_router(evaluations.router)
app.include_router(residents.router)

@app.get("/health")
def health():
    return {"status": "ok"}
