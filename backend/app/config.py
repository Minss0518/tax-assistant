from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    OPENAI_API_KEY: str

    KAKAO_CLIENT_ID: str = ""
    KAKAO_REDIRECT_URI: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    NAVER_CLIENT_ID: str = ""
    NAVER_CLIENT_SECRET: str = ""
    NAVER_REDIRECT_URI: str = ""

    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = ""
    LANGCHAIN_TRACING_V2: str = "true"

    class Config:
        env_file = ".env"

settings = Settings()