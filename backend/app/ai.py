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


class JamAIProvider:
    TABLE_CATEGORIZER = "aclis-issue-categorizer"
    TABLE_SUMMARIZER  = "aclis-report-summarizer"
    TABLE_TRENDS      = "aclis-trend-analyzer"

    def __init__(self, token: str, project_id: str, model: str):
        from jamaibase import JamAI
        self._client = JamAI(token=token, project_id=project_id)
        self._model  = model
        try:
            self._ensure_tables()
        except Exception as e:
            logger.warning("JamAI table init (non-fatal): %s", e)

    def _existing_tables(self) -> set[str]:
        try:
            pages = self._client.table.list_tables("action", count=100)
            return {t.id for t in pages.items}
        except Exception:
            return set()

    def _ensure_tables(self):
        try:
            from jamaibase.protocol import ActionTableSchemaCreate, ColumnSchemaCreate
        except ImportError:
            logger.warning("jamaibase.protocol not available")
            return

        existing = self._existing_tables()

        def _gen(system: str, prompt: str) -> dict:
            return {"model": self._model, "system_prompt": system, "prompt": prompt}

        if self.TABLE_CATEGORIZER not in existing:
            try:
                self._client.table.create_action_table(ActionTableSchemaCreate(
                    id=self.TABLE_CATEGORIZER,
                    cols=[
                        ColumnSchemaCreate(id="description", dtype="str"),
                        ColumnSchemaCreate(id="issue_type", dtype="str"),
                        ColumnSchemaCreate(
                            id="category",
                            dtype="str",
                            gen_config=_gen(
                                "Categorize the community issue into one short phrase in Malay (max 5 words). Return only the category label.",
                                "Jenis: {{issue_type}}\nPenerangan: {{description}}",
                            ),
                        ),
                    ],
                ))
            except Exception as e:
                logger.warning("Create %s: %s", self.TABLE_CATEGORIZER, e)

        if self.TABLE_SUMMARIZER not in existing:
            try:
                self._client.table.create_action_table(ActionTableSchemaCreate(
                    id=self.TABLE_SUMMARIZER,
                    cols=[
                        ColumnSchemaCreate(id="content", dtype="str"),
                        ColumnSchemaCreate(
                            id="summary",
                            dtype="str",
                            gen_config=_gen(
                                "Summarize the monthly kampung activity report in 2-3 sentences in Malay.",
                                "Laporan: {{content}}",
                            ),
                        ),
                    ],
                ))
            except Exception as e:
                logger.warning("Create %s: %s", self.TABLE_SUMMARIZER, e)

        if self.TABLE_TRENDS not in existing:
            try:
                self._client.table.create_action_table(ActionTableSchemaCreate(
                    id=self.TABLE_TRENDS,
                    cols=[
                        ColumnSchemaCreate(id="stats_json", dtype="str"),
                        ColumnSchemaCreate(
                            id="insights",
                            dtype="str",
                            gen_config=_gen(
                                "You are an analyst for a Malaysian district administration system (ACLIS). Given statistics JSON, provide 3-5 concise insight bullet points in Malay. One insight per line, no dashes or bullet symbols.",
                                "Statistik: {{stats_json}}",
                            ),
                        ),
                    ],
                ))
            except Exception as e:
                logger.warning("Create %s: %s", self.TABLE_TRENDS, e)

    def _run(self, table_id: str, data: dict, output_col: str) -> str | None:
        try:
            from jamaibase.protocol import RowAddRequest
            req = RowAddRequest(table_id=table_id, data=[data], stream=False)
            resp = self._client.table.add_table_rows("action", req)
            return resp.rows[0].columns[output_col].choices[0].message.content
        except Exception as e:
            logger.warning("JamAI _run(%s) failed: %s", table_id, e)
            return None

    def categorize_issue(self, description: str, issue_type: str | None) -> str | None:
        return self._run(
            self.TABLE_CATEGORIZER,
            {"description": description, "issue_type": issue_type or ""},
            "category",
        )

    def summarize_report(self, content: str) -> str | None:
        return self._run(self.TABLE_SUMMARIZER, {"content": content}, "summary")

    def trend_insights(self, stats: dict) -> list[str]:
        result = self._run(
            self.TABLE_TRENDS,
            {"stats_json": json.dumps(stats, ensure_ascii=False)},
            "insights",
        )
        if not result:
            return []
        return [line.strip() for line in result.splitlines() if line.strip()]


def _get_provider():
    from app.config import settings
    if settings.ai_provider == "jamai" and settings.jamai_token:
        try:
            return JamAIProvider(
                token=settings.jamai_token,
                project_id=settings.jamai_project_id,
                model=settings.jamai_model,
            )
        except Exception as e:
            logger.error("JamAI init failed, falling back to mock: %s", e)
    return MockProvider()


_provider = None


def ai():
    global _provider
    if _provider is None:
        _provider = _get_provider()
    return _provider
