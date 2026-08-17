from app.tax_agent.llm_client import get_openai_client


def test_get_openai_client_sets_timeout_and_retries():
    # I8: every OpenAI call across the 5 LLM-calling nodes previously had no
    # timeout, so a hung OpenAI request could block a node (and the request)
    # indefinitely. The shared client factory must set both.
    client = get_openai_client()

    assert client.timeout == 30.0
    assert client.max_retries == 2
