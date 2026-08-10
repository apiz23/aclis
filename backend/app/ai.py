from typing import Protocol
import logging
import json

logger = logging.getLogger(__name__)


class AIProvider(Protocol):
    def categorize_issue(self, description: str, issue_type: str | None) -> str | None: ...
    def summarize_report(self, content: str) -> str | None: ...
    def trend_insights(self, stats: dict) -> list[str]: ...


class MockProvider:
    def categorize_issue(self, description, issue_type): return None
    def summarize_report(self, content): return None
    def trend_insights(self, stats): return []


class GroqProvider:
    CATEGORIZE_SYSTEM = (
        "Categorize the community issue into one short phrase in Malay (max 5 words). "
        "Return only the category label."
    )
    SUMMARIZE_SYSTEM = (
        "Summarize the monthly kampung activity report in 2-3 sentences in Malay."
    )
    TRENDS_SYSTEM = (
        "You are an analyst for a Malaysian district administration system (ACLIS). "
        "Given statistics JSON, provide 3-5 concise insight bullet points in Malay. "
        "One insight per line, no dashes or bullet symbols."
    )

    def __init__(self, api_key: str, model: str):
        from groq import Groq
        self._client = Groq(api_key=api_key)
        self._model = model

    def _chat(self, system: str, user: str) -> str | None:
        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.3,
                max_tokens=256,
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning("Groq API call failed: %s", e)
            return None

    def categorize_issue(self, description: str, issue_type: str | None) -> str | None:
        user = f"Jenis: {issue_type or ''}\nPenerangan: {description}"
        return self._chat(self.CATEGORIZE_SYSTEM, user)

    def summarize_report(self, content: str) -> str | None:
        return self._chat(self.SUMMARIZE_SYSTEM, f"Laporan: {content}")

    def trend_insights(self, stats: dict) -> list[str]:
        result = self._chat(
            self.TRENDS_SYSTEM,
            f"Statistik: {json.dumps(stats, ensure_ascii=False)}",
        )
        if not result:
            return []
        return [line.strip() for line in result.splitlines() if line.strip()]


def _get_provider():
    from app.config import settings
    if settings.ai_provider == "groq" and settings.groq_api_key:
        try:
            return GroqProvider(
                api_key=settings.groq_api_key,
                model=settings.groq_model,
            )
        except Exception as e:
            logger.error("Groq init failed, falling back to mock: %s", e)
    return MockProvider()


_provider = None


def ai():
    global _provider
    if _provider is None:
        _provider = _get_provider()
    return _provider


def reset_ai_provider():
    global _provider
    _provider = None
