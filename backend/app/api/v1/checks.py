from fastapi import APIRouter

from app.api.deps import DB, OptionalUser
from app.core.errors import ApiError
from app.domain import detective
from app.models import ThreatCheck
from app.schemas import Indicator, ThreatCheckIn, ThreatCheckOut

router = APIRouter(tags=["protection"])


@router.post("/threat-checks", response_model=ThreatCheckOut, summary="Проверить сообщение, ссылку или письмо правилами",
             description="Без ИИ: AI Gateway ещё не подключён. Исходный текст не сохраняется — для вошедшего пользователя "
                         "в историю пишутся только тип, уровень риска, коды признаков и длина текста.")
def threat_check(body: ThreatCheckIn, db: DB, u: OptionalUser):
    if body.kind == "url" and not (body.url or "").strip():
        raise ApiError(422, "validation_error", "Проверьте поля запроса", {"url": "Вставьте адрес ссылки"})
    if body.kind != "url" and not body.text.strip():
        raise ApiError(422, "validation_error", "Проверьте поля запроса", {"text": "Вставьте текст сообщения или письма"})
    r = detective.check(body.kind, text=body.text, url=body.url, sender=body.sender, subject=body.subject)
    stored = False
    if u is not None:
        db.add(ThreatCheck(user_id=u.id, kind=body.kind, risk_level=r["risk_level"], indicator_ids=[h["id"] for h in r["detected_indicators"]],
                           input_length=len(body.text) + len(body.url or "") + len(body.sender or "") + len(body.subject or ""), engine=r["engine"]))
        db.commit()
        stored = True
    return ThreatCheckOut(**{k: v for k, v in r.items() if k != "detected_indicators"},
                          detected_indicators=[Indicator(**h) for h in r["detected_indicators"]], stored=stored)
