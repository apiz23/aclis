"""Tests for app/ai.py — MockProvider, factory, and GroqProvider (mocked client)."""
import pytest
from unittest.mock import MagicMock, patch
from app import config
from app.ai import MockProvider, GroqProvider, _get_provider, reset_ai_provider


# ── MockProvider ──────────────────────────────────────────────────────────────

class TestMockProvider:
    def setup_method(self):
        self.p = MockProvider()

    def test_categorize_returns_none(self):
        assert self.p.categorize_issue("lampu rosak", "Lampu Jalan") is None

    def test_summarize_returns_none(self):
        assert self.p.summarize_report("Laporan aktiviti bulan Jun") is None

    def test_trend_insights_returns_empty_list(self):
        assert self.p.trend_insights({"kampung_count": 10}) == []


# ── Factory ───────────────────────────────────────────────────────────────────

class TestFactory:
    def setup_method(self):
        reset_ai_provider()

    def teardown_method(self):
        reset_ai_provider()

    def test_returns_mock_when_ai_provider_is_mock(self, monkeypatch):
        monkeypatch.setattr(config.settings, "ai_provider", "mock")
        monkeypatch.setattr(config.settings, "groq_api_key", "")
        p = _get_provider()
        assert isinstance(p, MockProvider)

    def test_returns_mock_when_groq_key_empty(self, monkeypatch):
        monkeypatch.setattr(config.settings, "ai_provider", "groq")
        monkeypatch.setattr(config.settings, "groq_api_key", "")
        p = _get_provider()
        assert isinstance(p, MockProvider)

    def test_returns_groq_when_configured(self, monkeypatch):
        monkeypatch.setattr(config.settings, "ai_provider", "groq")
        monkeypatch.setattr(config.settings, "groq_api_key", "gsk-abc")
        monkeypatch.setattr(config.settings, "groq_model", "llama-3.3-70b-versatile")

        mock_client = MagicMock()
        mock_groq_cls = MagicMock(return_value=mock_client)

        with patch.dict("sys.modules", {"groq": MagicMock(Groq=mock_groq_cls)}):
            p = _get_provider()

        assert isinstance(p, GroqProvider)


# ── GroqProvider (mocked client) ─────────────────────────────────────────────

def _build_provider(mock_client: MagicMock) -> GroqProvider:
    p = object.__new__(GroqProvider)
    p._client = mock_client
    p._model = "llama-3.3-70b-versatile"
    return p


def _mock_chat(content: str) -> MagicMock:
    choice = MagicMock()
    choice.message.content = content
    resp = MagicMock()
    resp.choices = [choice]
    return resp


class TestGroqProvider:
    def setup_method(self):
        self.mock_client = MagicMock()
        self.p = _build_provider(self.mock_client)

    def test_categorize_issue_returns_category(self):
        self.mock_client.chat.completions.create.return_value = _mock_chat("Infrastruktur Jalan")
        result = self.p.categorize_issue("Jalan berlubang", "Jalan Rosak")
        assert result == "Infrastruktur Jalan"

    def test_summarize_report_returns_summary(self):
        self.mock_client.chat.completions.create.return_value = _mock_chat("Aktiviti bulan Jun berjalan lancar.")
        result = self.p.summarize_report("Laporan Jun 2025...")
        assert result == "Aktiviti bulan Jun berjalan lancar."

    def test_trend_insights_splits_lines(self):
        self.mock_client.chat.completions.create.return_value = _mock_chat(
            "Isu lampu jalan meningkat\nLaporan lewat berkurangan"
        )
        result = self.p.trend_insights({"open_issues": 5})
        assert result == ["Isu lampu jalan meningkat", "Laporan lewat berkurangan"]

    def test_trend_insights_filters_blank_lines(self):
        self.mock_client.chat.completions.create.return_value = _mock_chat(
            "Insight satu\n\n  \nInsight dua"
        )
        result = self.p.trend_insights({})
        assert result == ["Insight satu", "Insight dua"]

    def test_categorize_returns_none_on_exception(self):
        self.mock_client.chat.completions.create.side_effect = Exception("network error")
        result = self.p.categorize_issue("rosak", "Lain-lain")
        assert result is None

    def test_trend_insights_returns_empty_on_exception(self):
        self.mock_client.chat.completions.create.side_effect = Exception("timeout")
        result = self.p.trend_insights({})
        assert result == []
