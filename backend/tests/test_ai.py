"""Tests for app/ai.py — MockProvider, factory, and JamAIProvider (mocked client)."""
import pytest
from unittest.mock import MagicMock, patch
from app import config
from app.ai import MockProvider, JamAIProvider, _get_provider, reset_ai_provider


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
        monkeypatch.setattr(config.settings, "jamai_token", "")
        p = _get_provider()
        assert isinstance(p, MockProvider)

    def test_returns_mock_when_jamai_token_empty(self, monkeypatch):
        monkeypatch.setattr(config.settings, "ai_provider", "jamai")
        monkeypatch.setattr(config.settings, "jamai_token", "")
        p = _get_provider()
        assert isinstance(p, MockProvider)

    def test_returns_jamai_when_configured(self, monkeypatch):
        monkeypatch.setattr(config.settings, "ai_provider", "jamai")
        monkeypatch.setattr(config.settings, "jamai_token", "tok-abc")
        monkeypatch.setattr(config.settings, "jamai_project_id", "proj-xyz")
        monkeypatch.setattr(config.settings, "jamai_model", "openai/gpt-4o-mini")

        mock_client = MagicMock()
        mock_client.table.list_tables.return_value.items = []
        mock_jamai_cls = MagicMock(return_value=mock_client)
        mock_schema_cls = MagicMock()
        mock_col_cls = MagicMock()

        with patch.dict("sys.modules", {
            "jamaibase": MagicMock(JamAI=mock_jamai_cls),
            "jamaibase.protocol": MagicMock(
                ActionTableSchemaCreate=mock_schema_cls,
                ColumnSchemaCreate=mock_col_cls,
            ),
        }):
            p = _get_provider()

        assert isinstance(p, JamAIProvider)


# ── JamAIProvider (mocked client) ─────────────────────────────────────────────

@pytest.fixture()
def mock_jamai_modules():
    """Patch sys.modules so local 'from jamaibase...' imports get mocks."""
    mock_row_add_req = MagicMock()
    with patch.dict("sys.modules", {
        "jamaibase": MagicMock(),
        "jamaibase.types": MagicMock(MultiRowAddRequest=mock_row_add_req),
        "jamaibase.protocol": MagicMock(RowAddRequest=mock_row_add_req),
    }):
        yield mock_row_add_req


def _build_provider(mock_client: MagicMock) -> JamAIProvider:
    """Directly construct JamAIProvider, bypassing __init__."""
    p = object.__new__(JamAIProvider)
    p._client = mock_client
    p._model = "openai/gpt-4o-mini"
    return p


def _make_response(content: str, col: str = "category") -> MagicMock:
    row = MagicMock()
    row.columns[col].choices[0].message.content = content
    resp = MagicMock()
    resp.rows = [row]
    return resp


class TestJamAIProvider:
    def setup_method(self):
        self.mock_client = MagicMock()
        self.p = _build_provider(self.mock_client)

    def test_categorize_issue_returns_category(self, mock_jamai_modules):
        self.mock_client.table.add_table_rows.return_value = _make_response("Infrastruktur Jalan")
        result = self.p.categorize_issue("Jalan berlubang", "Jalan Rosak")
        assert result == "Infrastruktur Jalan"

    def test_summarize_report_returns_summary(self, mock_jamai_modules):
        self.mock_client.table.add_table_rows.return_value = _make_response(
            "Aktiviti bulan Jun berjalan lancar.", col="summary"
        )
        result = self.p.summarize_report("Laporan Jun 2025...")
        assert result == "Aktiviti bulan Jun berjalan lancar."

    def test_trend_insights_splits_lines(self, mock_jamai_modules):
        self.mock_client.table.add_table_rows.return_value = _make_response(
            "Isu lampu jalan meningkat\nLaporan lewat berkurangan", col="insights"
        )
        result = self.p.trend_insights({"open_issues": 5})
        assert result == ["Isu lampu jalan meningkat", "Laporan lewat berkurangan"]

    def test_trend_insights_filters_blank_lines(self, mock_jamai_modules):
        self.mock_client.table.add_table_rows.return_value = _make_response(
            "Insight satu\n\n  \nInsight dua", col="insights"
        )
        result = self.p.trend_insights({})
        assert result == ["Insight satu", "Insight dua"]

    def test_categorize_returns_none_on_exception(self, mock_jamai_modules):
        self.mock_client.table.add_table_rows.side_effect = Exception("network error")
        result = self.p.categorize_issue("rosak", "Lain-lain")
        assert result is None

    def test_trend_insights_returns_empty_on_exception(self, mock_jamai_modules):
        self.mock_client.table.add_table_rows.side_effect = Exception("timeout")
        result = self.p.trend_insights({})
        assert result == []
