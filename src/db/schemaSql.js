export const schemaSql = `
CREATE TABLE IF NOT EXISTS institutions (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('SCHOOL', 'COLLEGE') NOT NULL,
  code VARCHAR(120) NULL,
  address TEXT NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS academic_classes (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  section VARCHAR(120) NULL,
  academic_year VARCHAR(120) NULL,
  capacity INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_academic_classes_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_academic_classes_name (institution_id, name, section, academic_year),
  KEY idx_academic_classes_institution_id (institution_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  admission_number VARCHAR(120) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL DEFAULT '',
  mother_name VARCHAR(255) NULL,
  father_name VARCHAR(255) NULL,
  aadhaar_number VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  dob DATE NULL,
  course VARCHAR(255) NULL,
  class_name VARCHAR(255) NULL,
  class_id CHAR(36) NULL,
  section VARCHAR(120) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_students_class
    FOREIGN KEY (class_id) REFERENCES academic_classes(id) ON DELETE SET NULL,
  UNIQUE KEY uq_students_institution_admission (institution_id, admission_number),
  KEY idx_students_institution_id (institution_id),
  KEY idx_students_class_id (class_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_structures (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  class_id CHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  frequency VARCHAR(50) NOT NULL DEFAULT 'ONE_TIME',
  applicable_for VARCHAR(120) NOT NULL DEFAULT 'ALL',
  due_day_of_month INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fee_structures_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_structures_class
    FOREIGN KEY (class_id) REFERENCES academic_classes(id) ON DELETE CASCADE,
  KEY idx_fee_structures_institution_id (institution_id),
  KEY idx_fee_structures_class_id (class_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_invoices (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  fee_structure_id CHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  gross_amount DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fee_invoices_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_invoices_student
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_invoices_structure
    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE SET NULL,
  KEY idx_fee_invoices_student_id (student_id),
  KEY idx_fee_invoices_institution_id (institution_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_payments (
  id CHAR(36) PRIMARY KEY,
  fee_invoice_id CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
  reference_number VARCHAR(255) NULL,
  remarks TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fee_payments_invoice
    FOREIGN KEY (fee_invoice_id) REFERENCES fee_invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_payments_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_payments_student
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  KEY idx_fee_payments_invoice_id (fee_invoice_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS monthly_fee_ledgers (
  id CHAR(36) PRIMARY KEY,
  institution_id CHAR(36) NOT NULL,
  class_id CHAR(36) NULL,
  student_id CHAR(36) NOT NULL,
  fee_structure_id CHAR(36) NOT NULL,
  ledger_year INT NOT NULL,
  month_number INT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_on DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_monthly_fee_ledgers_institution
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  CONSTRAINT fk_monthly_fee_ledgers_class
    FOREIGN KEY (class_id) REFERENCES academic_classes(id) ON DELETE SET NULL,
  CONSTRAINT fk_monthly_fee_ledgers_student
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_monthly_fee_ledgers_structure
    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE CASCADE,
  UNIQUE KEY uq_monthly_fee_ledgers_unique (student_id, fee_structure_id, ledger_year, month_number)
) ENGINE=InnoDB;
`;
