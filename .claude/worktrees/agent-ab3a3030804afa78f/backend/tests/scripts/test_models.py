from scripts.models import MukimRow, KampungRow, LeaderRow, RejectRow

def test_mukim_defaults():
    m = MukimRow(name="Benut")
    assert m.parlimen == ""
    assert m.dun == ""

def test_kampung_defaults():
    k = KampungRow(name="Kg. Bukit", mukim_name="Benut")
    assert k.b40_count == 0
    assert k.profile == ""

def test_leader_required_fields():
    l = LeaderRow(
        name="Ahmad bin Ali",
        ic_no="800101011234",
        type="ketua_kampung",
        kampung_name="Kg. Bukit",
        mukim_name="Benut",
    )
    assert l.photo_bytes is None
    assert l.photo_url is None
    assert l.tarikh_lantikan is None
    assert l.source_row == 0

def test_leader_type_penghulu():
    l = LeaderRow(name="Siti", ic_no="900202021234", type="penghulu",
                  kampung_name="Kg. X", mukim_name="Benut")
    assert l.type == "penghulu"

def test_reject_row():
    r = RejectRow(source_file="test.xlsx", sheet="BENUT", row_num=5,
                  reason="invalid IC: 12345", raw_data="Ahmad,12345,Kg.X")
    assert r.row_num == 5
