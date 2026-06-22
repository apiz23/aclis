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
        type="ketua_kampung",
        kampung_name="Kg. Bukit",
        mukim_name="Benut",
    )
    assert l.ic_no is None
    assert l.photo_bytes is None
    assert l.photo_url is None
    assert l.tarikh_lantikan is None
    assert l.source_row == 0
    assert l.phone == ""
    assert l.address == ""
    assert l.kampung_rangkaian == ""

def test_leader_with_ic():
    l = LeaderRow(name="Ahmad bin Ali", type="ketua_kampung",
                  kampung_name="Kg. Bukit", mukim_name="Benut",
                  ic_no="800101011234")
    assert l.ic_no == "800101011234"

def test_leader_type_penghulu():
    l = LeaderRow(name="Siti", type="penghulu",
                  kampung_name="Kg. X", mukim_name="Benut")
    assert l.type == "penghulu"

def test_leader_type_ketua_masyarakat():
    l = LeaderRow(name="Tan Ah Kow", type="ketua_masyarakat",
                  kampung_name="Kg. Baru Bagan", mukim_name="Benut")
    assert l.type == "ketua_masyarakat"

def test_reject_row():
    r = RejectRow(source_file="test.xlsx", sheet="BENUT", row_num=5,
                  reason="invalid IC: 12345", raw_data="Ahmad,12345,Kg.X")
    assert r.row_num == 5
