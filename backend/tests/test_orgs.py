from sqlalchemy import select

from app.models import AuditLog, User
from tests.conftest import new_user

API = "/api/v1"


def _org(client, admin_h, name="Школа №1"):
    r = client.post(API + "/organizations", headers=admin_h, json={"name": name, "kind": "school"})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_only_admin_creates_org(client):
    _, learner = new_user(client)
    _, oadm = new_user(client, role="org_admin")
    for h in (learner, oadm):
        assert client.post(API + "/organizations", headers=h, json={"name": "X org"}).status_code == 403
    _, admin = new_user(client, role="admin")
    assert client.post(API + "/organizations", headers=admin, json={"name": "X org", "kind": "zzz"}).status_code == 422
    assert _org(client, admin)


def test_members_access_control(client, db):
    _, admin = new_user(client, role="admin")
    o1, o2 = _org(client, admin, "Org One"), _org(client, admin, "Org Two")
    _, oadm1 = new_user(client, role="org_admin", org_id=o1)
    m_email, _ = new_user(client)
    # org_admin другой организации — нельзя
    assert client.post(API + f"/organizations/{o2}/members", headers=oadm1, json={"email": m_email}).status_code == 403
    # org_admin своей — можно, но не назначать org_admin
    assert client.post(API + f"/organizations/{o1}/members", headers=oadm1, json={"email": m_email, "role": "org_admin"}).status_code == 403
    r = client.post(API + f"/organizations/{o1}/members", headers=oadm1, json={"email": m_email, "role": "learner"})
    assert r.status_code == 200
    u = db.scalar(select(User).where(User.email == m_email))
    assert u.organization_id == o1 and u.share_with_org is False  # согласие не включается само
    # в другую организацию — конфликт
    assert client.post(API + f"/organizations/{o2}/members", headers=admin, json={"email": m_email}).status_code == 409
    assert client.post(API + "/organizations/999/members", headers=admin, json={"email": m_email}).status_code == 404
    assert db.scalar(select(AuditLog).where(AuditLog.action == "org.member_set")) is not None


def test_summary_k_anonymity_and_consent(client):
    _, admin = new_user(client, role="admin")
    o = _org(client, admin)
    _, teacher = new_user(client, role="teacher", org_id=o)
    _, learner = new_user(client, org_id=o)
    _, outsider = new_user(client, role="org_admin", org_id=_org(client, admin, "Other"))
    assert client.get(API + f"/organizations/{o}/summary", headers=learner).status_code == 403
    assert client.get(API + f"/organizations/{o}/summary", headers=outsider).status_code == 403
    users = [new_user(client, org_id=o, share=(i < 4))[1] for i in range(6)]
    for h in users:
        client.post(API + "/attempts", headers=h, json={"kind": "call", "scenario": "bank_safe", "result": "ok", "score": 1})
    s = client.get(API + f"/organizations/{o}/summary", headers=teacher).json()
    assert s["enough_data"] is False and s["skills"] == [] and s["members_sharing"] == 4
    h5 = new_user(client, org_id=o, share=True)[1]
    client.post(API + "/attempts", headers=h5, json={"kind": "call", "scenario": "bank_safe", "result": "bad", "score": 0})
    s = client.get(API + f"/organizations/{o}/summary", headers=teacher).json()
    assert s["enough_data"] is True and s["members_sharing"] == 5
    assert all(x["learners"] >= 5 for x in s["skills"]) and s["skills"]
    assert set(s) == {"organization", "members_total", "members_sharing", "min_group", "enough_data", "skills", "attempts_30d", "note"}
    assert all(set(x) == {"skill", "title", "mean", "learners"} for x in s["skills"])  # только агрегаты, без людей
    assert client.get(API + f"/organizations/{o}/summary", headers=admin).status_code == 200


def test_share_with_org_requires_membership(client):
    _, h = new_user(client)
    assert client.patch(API + "/users/me", headers=h, json={"share_with_org": True}).status_code == 422
