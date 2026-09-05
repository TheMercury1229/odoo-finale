## Epic: Master Data Setup

### US-1.1 — Seed organization and initial admin

As the system, I need one Organization ("Urban Furniture") and one Admin user
seeded at first setup, so that there's an entry point into the system without
public self-signup.

Acceptance Criteria:

- Running the seed script creates exactly one Organization record.
- Seed script creates one User with role "admin" and adds them as a member
  of that Organization with role "admin".
- Re-running the seed script does not create duplicates (idempotent).

---

### US-1.2 — Seed Chart of Accounts

As the system, I need the six standard accounts (Cash, Bank, Debtors,
Creditors, Sales Income, Purchase Expense) pre-created, so that Journal
Entries always have valid accounts to post against.

Acceptance Criteria:

- Seed creates exactly these 6 accounts with correct types
  (Cash/Bank/Debtors = Asset, Creditors = Liability, Sales Income = Income,
  Purchase Expense = Expense).
- Admin can view this list but the seed itself is not user-triggered.
- Admin can optionally add more accounts later via a simple form
  (name + type).

---

### US-1.3 — Seed Journals

As the system, I need the four standard journals (Sales, Purchase, Bank,
Cash) pre-created, so transactions have a journal to post into without
manual setup.

Acceptance Criteria:

- Seed creates exactly these 4 journals with correct types.
- Sales Journal defaults to no fixed account (varies per transaction);
  Bank Journal defaults to the Bank account; Cash Journal defaults to
  the Cash account.

---

### US-1.4 — Admin creates a Contact

As an Admin or Accountant, I want to create a Contact (customer, vendor,
or both), so I can later record transactions against them.

Acceptance Criteria:

- Form captures: Name, Type (Customer/Vendor/Both), Email, Mobile,
  City, State, Pincode, Profile Image (optional).
- On save, a new Contact record is created, scoped to the org.
- I can optionally choose "Invite as portal user" — if checked, a User
  account is created with role "contact" and linked via contact.userId,
  and an invite email/link is generated.
- If I don't invite them, the Contact still saves fine with no linked user.

---

### US-1.5 — Admin/Accountant edits or archives a Contact

As an Admin or Accountant, I want to edit or archive a Contact, so I can
keep records accurate without losing transaction history.

Acceptance Criteria:

- Editing updates the Contact fields.
- "Archive" sets isArchived = true; it does not delete the record.
- Archived Contacts are hidden from "new transaction" pickers but still
  visible on historical documents.
- Only Admin can archive (per role permissions); Accountant can create/edit
  but not archive.

---

### US-1.6 — Admin bans/removes a Contact's portal access

As an Admin, I want to revoke a Contact user's login access, so they can
no longer access the portal, without deleting their business record.

Acceptance Criteria:

- Uses better-auth admin plugin's ban action on the linked User.
- The Contact record itself remains fully intact, still shows in Contact
  list, still linked to their historical invoices/bills.
- Banned user cannot log in; existing sessions are invalidated.

---

### US-1.7 — Admin/Accountant creates a Product

As an Admin or Accountant, I want to add a Product to the catalog, so it
can be used in Purchase/Sales Orders.

Acceptance Criteria:

- Form captures: Product Name, Type (Goods/Service/Combo), Sales Price,
  Cost Price, Category.
- On save, a new Product record is created, scoped to the org.
- Product appears immediately in product pickers for PO/SO creation.

---

### US-1.8 — Admin/Accountant edits or archives a Product

As an Admin or Accountant, I want to edit or archive a Product, so pricing
stays current without breaking historical order lines.

Acceptance Criteria:

- Editing updates Product fields (does not retroactively change past
  order line prices, which are stored at time of order).
- Archiving hides it from new-order pickers but keeps it valid on
  existing PO/SO/Bill/Invoice lines.
- Only Admin can archive; Accountant can create/edit only.
