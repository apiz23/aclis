from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""
    ai_provider: str = "mock"
    cors_origins: str = "http://localhost:3000"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
