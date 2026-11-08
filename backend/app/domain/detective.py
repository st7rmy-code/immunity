"""AI-детектив: проверка правилами (без ИИ). Перенос rulesSchema/urlRules/mailRules прототипа.

Регулярные выражения и таблицы берутся из seed/rules.json — их выгружает prototype/tools/export-content.cjs,
поэтому словари признаков живут в одном месте. Совпадение с прототипом проверяет tests/test_detective.py
(эталон — tests/fixtures/rules_parity.json).

Уровни признаков: критические решают сами; остальные складываются по правилам приоритета, а не по сумме баллов.
Процент уверенности не считается: эвристика не откалибрована на проверенной выборке.
"""
import ipaddress
import json
import re
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qsl, urlsplit

ENGINE = "rules-v2"
TIER_N = {"critical": 4, "strong": 3, "medium": 2, "weak": 1}
NEG_IDS = {"codes", "app", "cash", "safe"}
WCH = re.compile(r"[а-яёa-z0-9]", re.I)


def js_re(source: str, flags: str = "") -> re.Pattern:
    """Регулярка JS → Python с той же семантикой: \\d, \\w, \\b — только ASCII, $ — строго конец строки."""
    out, i, cls = [], 0, False
    while i < len(source):
        c = source[i]
        if c == "\\" and i + 1 < len(source):
            n = source[i + 1]
            if n == "d":
                out.append("0-9" if cls else "[0-9]")
            elif n == "w":
                out.append("A-Za-z0-9_" if cls else "[A-Za-z0-9_]")
            elif n == "b" and not cls:
                out.append(r"(?:(?<=[A-Za-z0-9_])(?![A-Za-z0-9_])|(?<![A-Za-z0-9_])(?=[A-Za-z0-9_]))")
            else:
                out.append(c + n)
            i += 2
            continue
        if c == "[" and not cls:
            cls = True
        elif c == "]" and cls:
            cls = False
        elif c == "$" and not cls:
            out.append(r"\Z")
            i += 1
            continue
        out.append(c)
        i += 1
    fl = re.I if "i" in flags else 0
    return re.compile("".join(out), fl | (re.M if "m" in flags else 0))


@lru_cache
def rules() -> dict:
    raw = json.loads((Path(__file__).resolve().parent.parent / "seed" / "rules.json").read_text(encoding="utf-8"))
    R = lambda x: js_re(x["source"], x["flags"])  # noqa: E731
    return {
        "flags": [dict(f, rx=R(f["re"]), need_rx=R(f["need"]) if f["need"] else None) for f in raw["flags"]],
        "flag_tier": raw["flag_tier"], "actions": raw["actions"], "strength": raw["strength"],
        **{k: R(raw[k]) for k in ("inject", "neg_before", "shorteners", "risky_tld", "lure", "redir_keys", "free_mail", "org", "cyr_lookalike")},
    }


def _widen(text: str, a: int, b: int) -> tuple[int, int]:
    while a > 0 and WCH.match(text[a - 1]) and WCH.match(text[a]):
        a -= 1
    while b < len(text) and WCH.match(text[b]) and WCH.match(text[b - 1]):
        b += 1
    return a, b


def local_check(text: str) -> list[dict]:
    hits = []
    for f in rules()["flags"]:
        ms = []
        for m in f["rx"].finditer(text):
            if m.end() == m.start():
                continue
            a, b = _widen(text, m.start(), m.end())
            ms.append({"index": a, "text": text[a:b]})
        if ms and (f["need_rx"] is None or f["need_rx"].search(text)):
            hits.append({"f": f, "ms": ms})
    return hits


def negated(text: str, idx: int) -> bool:
    return bool(rules()["neg_before"].search(text[max(0, idx - 40):idx]))


# --- разбор адреса ---
def scripts_of(t: str) -> dict:
    return {"lat": bool(re.search(r"[a-z]", t, re.I)), "cyr": bool(re.search(r"[а-яё]", t, re.I)), "grk": bool(re.search(r"[α-ω]", t, re.I))}


def _label_ascii(label: str) -> str:
    if all(ord(ch) < 128 for ch in label):
        return label.lower()
    try:
        return "xn--" + label.lower().encode("punycode").decode("ascii")
    except UnicodeError:
        return label.lower()


def _label_unicode(label: str) -> str:
    if label.lower().startswith("xn--"):
        try:
            return label[4:].encode("ascii").decode("punycode")
        except (UnicodeError, ValueError):
            return label
    return label


def parse_url(raw: str) -> dict | None:
    s = str(raw or "").strip()
    if not s:
        return None
    m = re.match(r"^([a-z][a-z0-9+.-]*):", s, re.I)
    scheme = m.group(1) if m else None
    if scheme and not re.match(r"^https?$", scheme, re.I) and not s[len(scheme) + 1:].startswith("//"):
        return {"scheme": scheme.lower(), "raw": s, "opaque": True}
    if not scheme:
        s = "http://" + re.sub(r"^//", "", s)
    try:
        u = urlsplit(s)
        port = u.port
        host = u.hostname
    except ValueError:
        return {"bad": True, "raw": s}
    if not host or any(ch in host for ch in " <>\"{}|\\^`"):
        return {"bad": True, "raw": s}
    bracket = "[" in (u.netloc.rsplit("@", 1)[-1])
    labels = host.split(".")
    ascii_host = "[" + host + "]" if bracket else ".".join(_label_ascii(lb) for lb in labels)
    uhost = host if bracket else ".".join(_label_unicode(lb) for lb in ascii_host.split("."))
    return {"u": u, "port": port, "scheme": u.scheme.lower(), "host": ascii_host, "uhost": uhost, "explicit": bool(scheme), "raw": s, "ipv6": bracket}


def _is_ip(host: str, ipv6: bool) -> bool:
    if ipv6 or host.startswith("["):
        return True
    if re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", host):
        return True
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def url_rules(raw: str) -> list[dict]:
    R = rules()
    hits: list[dict] = []

    def add(id_, tier, title, why, quote=""):
        hits.append({"id": id_, "tier": tier, "title": title, "explanation": why, "quote": quote or ""})

    P = parse_url(raw)
    if not P:
        return hits
    if P.get("opaque"):
        dang = P["scheme"] in ("javascript", "data", "vbscript", "file", "blob", "intent", "content")
        add("url_scheme", "critical" if dang else "medium", "Опасный тип ссылки" if dang else "Необычный тип ссылки",
            "Такие ссылки выполняют код или открывают файлы на устройстве. Не открывайте." if dang else
            "Это не обычная веб-ссылка. Убедитесь, что понимаете, что она откроет.", P["scheme"] + ":")
        return hits
    if P.get("bad"):
        add("url_bad", "weak", "Адрес не разобрать", "Проверьте, что ссылка скопирована целиком.", str(raw)[:60])
        return hits
    u, host, uhost = P["u"], P["host"], P["uhost"]
    if u.username is not None or u.password is not None:
        add("url_at", "critical", "В адрес спрятаны логин или «@»",
            "Всё, что стоит до @, браузер не считает адресом сайта: настоящий сайт — после @. Так маскируют поддельные страницы.", (u.username or "") + "@")
    if P["explicit"] and P["scheme"] == "http":
        add("url_http", "weak", "Нет защищённого соединения", "Адрес начинается с http://. Но и https не доказывает, что сайт честный.", "http://")
    ip = _is_ip(host, P["ipv6"])
    if ip:
        add("url_ip", "strong", "Вместо имени сайта — IP-адрес", "Организации не присылают ссылки на набор цифр.", host)
    else:
        labels = uhost.split(".")
        tld = labels[-1]
        mixed = next((lb for lb in labels if (lambda sc: (sc["lat"] and sc["cyr"]) or (sc["grk"] and (sc["lat"] or sc["cyr"])))(scripts_of(lb))), None)
        if mixed:
            add("url_mix", "strong", "Буквы разных алфавитов в одном слове адреса",
                "Так подделывают известные адреса: русская «о» и латинская «o» выглядят одинаково.", mixed)
        else:
            cyr_like = next((lb for lb in labels[:-1] if scripts_of(lb)["cyr"] and R["cyr_lookalike"].search(lb)), None)
            if cyr_like and not re.fullmatch(r"рф|рус|москва|дети|сайт|онлайн", tld):
                add("url_confusable", "strong", "Кириллица, похожая на латиницу",
                    "Адрес набран русскими буквами, которые выглядят как латинские, в нелатинской зоне.", cyr_like)
        if re.search(r"(^|\.)xn--", host) and not mixed and uhost != host and not scripts_of(uhost)["cyr"]:
            add("url_puny", "medium", "Адрес закодирован (xn--)", "Под кодом могут быть символы, похожие на обычные буквы. Раскодированный адрес: " + uhost, host)
        if R["shorteners"].search(host):
            add("url_short", "weak", "Короткая ссылка скрывает адрес", "Куда она ведёт, не видно, пока не откроете.", host)
        risky = bool(R["risky_tld"].search(host))
        if risky:
            add("url_tld", "weak", "Зона, популярная у одноразовых сайтов", "Такие домены дёшевы. Сама по себе зона — не доказательство.", "." + tld)
        lure = list(dict.fromkeys(m.group(0).lower() for m in R["lure"].finditer(host)))
        if lure:
            add("url_lure", "weak", "Слова-приманки в адресе", "«" + "», «".join(lure[:3]) + "» — так адрес делают похожим на банк, оплату или госуслуги. У настоящих сервисов они тоже бывают.", lure[0])
        hy, deep = uhost.count("-"), len(labels) >= 4  # «xn--» у кириллических доменов — не признак
        if deep or hy >= 2:
            add("url_long", "weak", "Длинный составной адрес", "Много дефисов и поддоменов — частый приём поддельных сайтов.", host)
        if lure and (risky or hy >= 2 or deep):
            add("url_combo", "strong", "Приманка в одноразовом адресе",
                "Слова «оплата», «вход», «госуслуги» в дешёвой зоне или в длинном составном адресе — типичный фишинг.", host)
    if P["port"] is not None and str(P["port"]) not in ("80", "443"):
        add("url_port", "medium", "Нестандартный порт", "Обычные сайты не указывают порт в адресе.", ":" + str(P["port"]))
    fm = re.search(r"[^/]+\.(apk|exe|scr|msi|bat|cmd|js|vbs|jar|zip|rar|7z|iso|dmg)$", u.path or "", re.I)
    if fm:
        add("url_file", "critical", "Ссылка скачивает файл-программу",
            "Так распространяют вредоносные программы, в том числе для удалённого доступа к телефону.", fm.group(0))
    for k, v in parse_qsl(u.query, keep_blank_values=True):
        if (R["redir_keys"].search(k) and re.search(r"^(https?:)?//|^www\.", v, re.I)) or re.search(r"^https?://", v, re.I):
            add("url_redirect", "medium", "Ссылка перенаправляет на другой адрес", "Настоящий адрес назначения спрятан в параметре ссылки.", k + "=" + v[:40])
            break
    return hits


def mail_rules(sender: str, subject: str, body: str) -> list[dict]:
    R = rules()
    hits: list[dict] = []

    def add(id_, tier, title, why, quote=""):
        hits.append({"id": id_, "tier": tier, "title": title, "explanation": why, "quote": quote or ""})

    am = re.search(r"[A-Za-z0-9_.+-]+@([A-Za-z0-9_.-]+\.[a-zа-я]{2,})", sender, re.I)
    dom = am.group(1).lower() if am else ""
    claims_org = bool(R["org"].search(sender + " " + subject + " " + body))
    if dom and R["free_mail"].search(dom) and claims_org:
        add("mail_free", "strong", "«Организация» пишет с бесплатной почты", "Банки и ведомства пишут со своих доменов, а не с личных ящиков.", am.group(0))
    if dom:
        keep = {"url_tld", "url_lure", "url_mix", "url_confusable", "url_puny", "url_long", "url_combo"}
        for h in url_rules(dom):
            if h["id"] in keep:
                hits.append(dict(h, id="mail_" + h["id"], title="Адрес отправителя: " + h["title"].lower()))
    elif sender:
        add("mail_noaddr", "weak", "Не видно адреса отправителя", "Посмотрите полный адрес, а не только имя: имя можно написать любое.")
    mt = subject + " " + body
    att = re.search(r"[^\s«»\"']+\.(zip|rar|7z|exe|apk|scr|js|iso|html?|docm|xlsm)(?![A-Za-z0-9_])", mt, re.I) or re.search(r"вложени\S*|архив\S*", mt, re.I)
    if att:
        add("mail_attach", "critical" if re.search(r"\.(exe|apk|scr|js|iso)(?![A-Za-z0-9_])", att.group(0), re.I) else "medium",
            "Предлагают открыть вложение", "Во вложениях к таким письмам прячут вредоносные программы или поддельные формы входа.", att.group(0))
    return hits


def level_from_tiers(c: dict[str, int]) -> str:
    if c["critical"]:
        return "critical"
    if c["strong"]:
        return "high"
    if c["medium"] >= 3:
        return "high"
    if c["medium"] >= 2 or (c["medium"] == 1 and c["weak"] >= 1):
        return "medium"
    if c["medium"] == 1 or c["weak"]:
        return "low"
    return "unknown"


def check(kind: str, text: str = "", url: str | None = None, sender: str | None = None, subject: str | None = None) -> dict:
    R = rules()
    text, url, sender, subject = text or "", (url or "").strip(), sender or "", subject or ""
    body = (subject + "\n" if subject else "") + text if kind == "mail" else text
    hits = []
    for h in local_check(body):
        fid = h["f"]["id"]
        if kind == "url" and fid == "link":
            continue
        idx = h["ms"][0]["index"]
        neg = fid in NEG_IDS and negated(body, idx)
        hits.append({"id": fid, "tier": "weak" if neg else R["flag_tier"].get(fid, "medium"),
                     "title": "Упоминание в предупреждении: " + h["f"]["title"].lower() if neg else h["f"]["title"],
                     "quote": h["ms"][0]["text"],
                     "explanation": "Фраза похожа на совет «не сообщать», а не на просьбу. Всё равно проверьте отправителя." if neg else h["f"]["why"]})
    inj = R["inject"].search(body)
    if inj:
        hits.append({"id": "inject", "tier": "strong", "title": "Текст пытается управлять проверкой", "quote": inj.group(0),
                     "explanation": "Честному сообщению незачем давать указания проверяющей программе. Это признак манипуляции."})
    if kind == "url":
        hits = url_rules(url) + hits
    if kind == "mail":
        hits = mail_rules(sender, subject, text) + hits
    hits.sort(key=lambda h: -TIER_N[h["tier"]])
    cnt = {"critical": 0, "strong": 0, "medium": 0, "weak": 0}
    for h in hits:
        cnt[h["tier"]] += 1
    level = level_from_tiers(cnt)
    top = next((t for t in ("critical", "strong", "medium", "weak") if cnt[t]), "none")
    ids = list(dict.fromkeys(("url" if h["id"].startswith("url_") else "mail" if h["id"].startswith("mail_") else h["id"])
                             for h in hits if h["tier"] != "weak" or len(hits) == 1))
    rec = [R["actions"][i] for i in ids if i in R["actions"]][:3] or ["Если сомневаетесь, свяжитесь с организацией или человеком по известному вам номеру"]
    lim = ["Правила ищут типовые фразы и приметы адресов. Контекст, иронию и новые схемы они не понимают."]
    if kind == "url":
        lim.append("Страницу никто не открывал: проверен только адрес. Репутацию сайта, DNS и содержимое страницы сервис не проверяет. Замок и https не означают, что сайт честный.")
    if kind == "mail":
        lim.append("Адрес отправителя можно подделать, поэтому проверка по нему не окончательная.")
    if not hits:
        lim.insert(0, "Типовых признаков не нашлось, но это не значит, что всё безопасно.")
    if not hits:
        expl = ("В адресе нет типичных признаков подделки. Сам по себе адрес не доказывает, что сайт честный." if kind == "url"
                else "Правила не нашли типовых признаков обмана. Оценить риск без контекста нельзя.")
    else:
        expl = {"critical": "Есть критический признак: так действуют мошенники, когда человек уже на шаг от потери денег или доступа.",
                "high": "Найдены сильные признаки мошеннической схемы.",
                "medium": "Есть признаки, характерные для обмана. Проверьте через независимый канал."}.get(level, "Есть только слабые признаки. Само по себе это не говорит об обмане.")
    return {"risk_level": level, "confidence": None, "strength": R["strength"][top], "detected_indicators": hits[:8], "explanation": expl,
            "limitations": lim, "recommended_actions": rec,
            "avoid_actions": ["Не сообщайте коды из СМС, пароли и данные карты", "Не переводите деньги и не берите кредиты по чужой просьбе",
                              "Не открывайте вложения и ссылки из письма" if kind == "mail" else "Не переходите по ссылкам из сообщения и ничего там не вводите"],
            "engine": ENGINE}
