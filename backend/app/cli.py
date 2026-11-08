"""Служебные команды.

python -m app.cli create-admin admin@example.org   — пароль спрашивается в терминале (не в аргументах и не в истории shell)
"""
import getpass
import sys

from sqlalchemy import select

from app.api.deps import audit
from app.core.db import get_sessionmaker
from app.core.security import hash_password, password_problem
from app.models import User


def create_admin(email: str) -> int:
    email = email.strip().lower()
    pw = getpass.getpass("Пароль администратора: ")
    if (p := password_problem(pw, email)) or pw != getpass.getpass("Ещё раз: "):
        print(p or "Пароли не совпадают", file=sys.stderr)
        return 1
    with get_sessionmaker()() as db:
        u = db.scalar(select(User).where(User.email == email))
        if u:
            u.role, u.password_hash, u.token_version, u.organization_id = "admin", hash_password(pw), u.token_version + 1, None
        else:
            u = User(email=email, password_hash=hash_password(pw), role="admin")
            db.add(u)
        db.flush()
        audit(db, "admin.create", None, f"user:{u.id}")
        db.commit()
    print("Администратор готов:", email)
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "create-admin":
        sys.exit(create_admin(sys.argv[2]))
    print(__doc__)
    sys.exit(2)
