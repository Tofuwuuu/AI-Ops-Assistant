"""Optional fake demo data for local runs.

    docker compose exec backend python -m app.seed_demo

Adds two made-up contacts (example.com addresses) and one open invoice to the
seeded Demo Agency account. Running it again adds nothing. Local use only.
"""

from __future__ import annotations

from app.db import SessionLocal
from app.models import Account, Contact, Invoice, InvoiceLineItem, InvoiceStatus

CONTACTS = [
    ("Pat Example", "pat@example.com"),
    ("Sam Placeholder", "sam@example.com"),
]
INVOICE_DESCRIPTION = "Sample invoice for testing. Not a real charge."


def main() -> None:
    with SessionLocal() as db:
        account = db.query(Account).filter(Account.slug == "demo-agency").first()
        if account is None:
            raise SystemExit("Start the API once first; it creates the Demo Agency account.")
        added = 0
        for name, email in CONTACTS:
            if not db.query(Contact).filter(Contact.account_id == account.id, Contact.email == email).first():
                db.add(Contact(account_id=account.id, name=name, email=email))
                added += 1
        if not db.query(Invoice).filter(Invoice.account_id == account.id, Invoice.description == INVOICE_DESCRIPTION).first():
            inv = Invoice(
                account_id=account.id,
                amount=120.0,
                currency="usd",
                description=INVOICE_DESCRIPTION,
                status=InvoiceStatus.open,
            )
            db.add(inv)
            db.flush()
            db.add(InvoiceLineItem(invoice_id=inv.id, description="Sample service hours", quantity=2, unit_amount=60.0))
            added += 1
        db.commit()
        print(f"Added {added} demo records." if added else "Demo records already present.")


if __name__ == "__main__":
    main()
