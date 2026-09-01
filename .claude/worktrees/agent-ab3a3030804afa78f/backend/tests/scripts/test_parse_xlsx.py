# backend/tests/scripts/test_parse_xlsx.py
from scripts.parse_xlsx import list_sheets, parse_leaders_file, PONTIAN_MUKIM_SHEETS


def test_list_sheets(leaders_xlsx):
    sheets = list_sheets(leaders_xlsx)
    assert "BENUT" in sheets
    assert "SKIP_SHEET" in sheets


def test_parse_leaders_file_filters_out_of_scope(leaders_xlsx):
    leaders, rejects = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    kampungs = [l.kampung_name for l in leaders]
    assert not any("JB" in k for k in kampungs), "SKIP_SHEET rows must be excluded"


def test_parse_leaders_file_returns_valid_rows(leaders_xlsx):
    leaders, rejects = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    assert len(leaders) == 2  # Ahmad + Siti
    assert leaders[0].name == "Ahmad bin Ali"
    assert leaders[0].ic_no == "800101011234"   # hyphens stripped
    assert leaders[0].mukim_name == "BENUT"
    assert leaders[1].ic_no == "900202021234"   # spaces stripped


def test_parse_leaders_file_rejects_bad_ic(leaders_xlsx):
    leaders, rejects = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    assert len(rejects) == 1
    assert "12345" in rejects[0].reason


def test_parse_leaders_file_normalizes_date(leaders_xlsx):
    leaders, _ = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    assert leaders[0].tarikh_lantikan == "2020-01-01"
    assert leaders[1].tarikh_lantikan == "2018-03-15"


def test_parse_leaders_file_records_source_row(leaders_xlsx):
    leaders, _ = parse_leaders_file(leaders_xlsx, include_sheets={"BENUT"})
    # Ahmad is in row 2 (header is row 1)
    assert leaders[0].source_row == 2


def test_pontian_mukim_sheets_constant():
    assert "BENUT" in PONTIAN_MUKIM_SHEETS
    assert isinstance(PONTIAN_MUKIM_SHEETS, set)
