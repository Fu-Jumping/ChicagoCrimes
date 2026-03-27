from __future__ import annotations

from app.database import Base, engine
from app.models import crime as _crime  # noqa: F401


def main() -> None:
    Base.metadata.create_all(bind=engine)
    print("OK: schema created/verified.")


if __name__ == "__main__":
    main()

