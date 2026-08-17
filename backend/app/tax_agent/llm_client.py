from openai import AsyncOpenAI

from app.config import settings as app_settings


def get_openai_client() -> AsyncOpenAI:
    """Shared OpenAI client factory for all tax-agent LLM-calling nodes.

    Centralizes timeout/retry configuration so a slow/hung OpenAI call can't
    block a graph node (and therefore the request) indefinitely.
    """
    return AsyncOpenAI(api_key=app_settings.OPENAI_API_KEY, timeout=30.0, max_retries=2)
