# Maurya School Management

Full-stack Next.js app for managing multiple schools and colleges with MySQL-backed student and fee management.

## Features

- Manage multiple institutions with `SCHOOL` and `COLLEGE` types.
- Add and update students per institution.
- Define reusable fee structures per institution.
- Create fee invoices directly or from fee structures.
- Track discounts, paid amounts, outstanding balances, and payment history.
- Get student-wise fee summaries.

## Tech

- Next.js App Router
- React
- MySQL

## Environment

Create a `.env` file in the project root.

```env
DB_PROVIDER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mauryaschool
DB_USER=root
DB_PASSWORD=your_password
DB_SSL=false

# Optional override
DATABASE_URL=
HOST=127.0.0.1
PORT=3000
```

## Setup

```bash
npm install
npm run db:init
npm run dev
```

If your MySQL host, password, or database name is different, update the `DB_*` values in `.env`.

The app runs on `http://localhost:3000`.

## UI Pages

- `/`
- `/institutions`
- `/students`
- `/fees`

## API Overview

### Health

`GET /api/health`

### Institutions

- `GET /api/institutions`
- `GET /api/institutions/:institutionId`
- `POST /api/institutions`

### Students

- `GET /api/students`
- `GET /api/students?institutionId=<id>`
- `GET /api/students/:studentId`
- `PATCH /api/students/:studentId`
- `POST /api/students`
- `GET /api/students/:studentId/fees`

Student payload:

```json
{
  "institutionId": "institution-id",
  "admissionNumber": "2026-001",
  "firstName": "Aarav",
  "lastName": "Singh",
  "course": "BCA",
  "className": "First Year"
}
```

### Fee Structures

- `GET /api/fees/structures`
- `GET /api/fees/structures?institutionId=<id>`
- `POST /api/fees/structures`

Payload:

```json
{
  "institutionId": "institution-id",
  "name": "Tuition Fee",
  "amount": 25000,
  "frequency": "SEMESTER",
  "applicableFor": "BCA",
  "dueDayOfMonth": 10
}
```

### Fee Invoices

- `GET /api/fees/assignments`
- `GET /api/fees/assignments?studentId=<id>`
- `POST /api/fees/assignments`
- `POST /api/fees/assignments/from-structure`

Direct invoice payload:

```json
{
  "studentId": "student-id",
  "title": "Semester 1 Tuition",
  "grossAmount": 25000,
  "discountAmount": 5000,
  "dueDate": "2026-04-15"
}
```

Create from structure payload:

```json
{
  "studentId": "student-id",
  "feeStructureId": "structure-id",
  "discountAmount": 1000,
  "dueDate": "2026-04-15"
}
```

### Payments

- `GET /api/fees/payments`
- `POST /api/fees/payments`

Payment payload:

```json
{
  "feeInvoiceId": "invoice-id",
  "amount": 10000,
  "paymentMethod": "UPI",
  "referenceNumber": "TXN-1001"
}
```

## Fee Model

- `fee_structures`: reusable institution-level templates like tuition, transport, lab, or hostel fees
- `fee_invoices`: student-level fee records with gross amount, discount, and net payable amount
- `fee_payments`: payment ledger for invoices

## Notes

- API routes live under `src/app/api`.
- The app lazily ensures schema availability when pages or routes first hit the database.
- For production, add authentication, role-based access, and proper migrations.
