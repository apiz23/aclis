from unittest.mock import MagicMock
from scripts.import_issues import parse_issues_file, import_issues
from scripts.import_evaluations import parse_evaluations_file, import_evaluations
from scripts.supabase_writer import SupabaseWriter


def _dry_writer() -> SupabaseWriter:
    return SupabaseWriter(client=MagicMock(), supabase_url="https://test.supabase.co",
                          dry_run=True)


def test_parse_issues_file(issues_xlsx):
    rows = parse_issues_file(issues_xlsx)
    assert len(rows) == 2
    assert rows[0]["type"] == "Lampu Jalan"
    assert rows[0]["kampung_name"] == "Kg. Bukit Benut"


def test_import_issues_dry_run(issues_xlsx):
    writer = _dry_writer()
    kampung_map = {"Kg. Bukit Benut": "uuid-1", "Kg. Sungai Benut": "uuid-2"}
    count = import_issues(issues_xlsx, writer, kampung_map)
    assert count == 2


def test_parse_evaluations_file(evaluations_xlsx):
    rows = parse_evaluations_file(evaluations_xlsx)
    assert len(rows) == 1
    assert rows[0]["ic_no"] == "800101011234"
    assert rows[0]["scores"]["Akhlak"] == 8
    assert rows[0]["total"] == 47


def test_import_evaluations_dry_run(evaluations_xlsx):
    writer = _dry_writer()
    leader_map = {"800101011234": "leader-uuid-1"}
    count = import_evaluations(evaluations_xlsx, writer, leader_map)
    assert count == 1
