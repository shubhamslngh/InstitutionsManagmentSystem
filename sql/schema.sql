CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('SCHOOL', 'COLLEGE')),
  code TEXT,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  course TEXT,
  class_name TEXT,
  section TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, admission_number)
);

CREATE TABLE IF NOT EXISTS academic_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section TEXT,
  academic_year TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES academic_classes(id) ON DELETE SET NULL;
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS dob DATE;

CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  class_id UUID REFERENCES academic_classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL DEFAULT 'ONE_TIME',
  applicable_for TEXT DEFAULT 'ALL',
  due_day_of_month INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fee_structures
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES academic_classes(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount > 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  net_amount NUMERIC(12, 2) NOT NULL CHECK (net_amount > 0),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_invoice_id UUID NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  reference_number TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_fee_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  class_id UUID REFERENCES academic_classes(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  ledger_year INTEGER NOT NULL,
  month_number INTEGER NOT NULL CHECK (month_number BETWEEN 1 AND 12),
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_on TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_institution_id ON students (institution_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students (class_id);
CREATE INDEX IF NOT EXISTS idx_academic_classes_institution_id ON academic_classes (institution_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_classes_unique_name
  ON academic_classes (institution_id, name, COALESCE(section, ''), COALESCE(academic_year, ''));
CREATE INDEX IF NOT EXISTS idx_fee_structures_institution_id ON fee_structures (institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_id ON fee_structures (class_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student_id ON fee_invoices (student_id);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_institution_id ON fee_invoices (institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice_id ON fee_payments (fee_invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_fee_ledgers_unique
  ON monthly_fee_ledgers (student_id, fee_structure_id, ledger_year, month_number);
