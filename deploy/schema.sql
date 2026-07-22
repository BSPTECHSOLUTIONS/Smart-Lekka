-- ============================================================
-- Smart Lekka — PostgreSQL Schema
-- Run this on a fresh database before starting the app.
-- The app auto-seeds demo/test data on first start.
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  mobile       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  mobile        TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_id     INTEGER REFERENCES clients(id),
  supervisor_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS settings (
  id              SERIAL PRIMARY KEY,
  amount_per_hour REAL NOT NULL DEFAULT 0,
  user_id         INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workers (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  mobile          TEXT,
  advance_balance REAL NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id         INTEGER REFERENCES users(id),
  client_id       INTEGER REFERENCES clients(id)
);

-- Safe to re-run on an existing database that was created before this
-- column existed — adds it only if missing, defaulting existing rows to 0.
ALTER TABLE workers ADD COLUMN IF NOT EXISTS advance_balance REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS work_logs (
  id          SERIAL PRIMARY KEY,
  worker_id   INTEGER NOT NULL REFERENCES workers(id),
  field_name  TEXT NOT NULL,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  total_hours REAL NOT NULL,
  amount      REAL NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_amount REAL NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'PENDING',
  jcb_user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id           SERIAL PRIMARY KEY,
  worker_id    INTEGER NOT NULL REFERENCES workers(id),
  amount_paid  REAL NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  jcb_user_id  INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id),
  description           TEXT NOT NULL,
  category              TEXT NOT NULL,
  amount                REAL NOT NULL,
  amount_paid           REAL NOT NULL DEFAULT 0,
  supervisor_paid_amount REAL NOT NULL DEFAULT 0,
  date                  TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id              SERIAL PRIMARY KEY,
  supervisor_id   INTEGER NOT NULL REFERENCES users(id),
  client_id       INTEGER REFERENCES clients(id),
  invoice_number  TEXT NOT NULL,
  client_name     TEXT NOT NULL,
  client_mobile   TEXT,
  total_amount    REAL NOT NULL DEFAULT 0,
  paid_amount     REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'PENDING',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          SERIAL PRIMARY KEY,
  invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      REAL NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id           SERIAL PRIMARY KEY,
  invoice_id   INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount_paid  REAL NOT NULL,
  note         TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jcb_settlements (
  id               SERIAL PRIMARY KEY,
  jcb_user_id      INTEGER NOT NULL REFERENCES users(id),
  supervisor_id    INTEGER NOT NULL REFERENCES users(id),
  settlement_date  DATE NOT NULL,
  amount_received  NUMERIC NOT NULL DEFAULT 0,
  expenses_paid    NUMERIC NOT NULL DEFAULT 0,
  net_amount       NUMERIC NOT NULL DEFAULT 0,
  previous_pending NUMERIC NOT NULL DEFAULT 0,
  total_to_collect NUMERIC NOT NULL DEFAULT 0,
  collected        NUMERIC NOT NULL DEFAULT 0,
  pending          NUMERIC NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes — every column below is used as a filter in the API
-- (per-worker, per-vehicle/JCB, per-client, per-supervisor, or
-- date-range lookups). Without these, those queries degrade to
-- full table scans as data grows. Safe to run on an existing
-- database; CREATE INDEX IF NOT EXISTS is a no-op if already applied.
-- ============================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_client_id      ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_supervisor_id  ON users(supervisor_id);

-- workers
CREATE INDEX IF NOT EXISTS idx_workers_user_id      ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_client_id    ON workers(client_id);

-- work_logs — filtered by worker on every dashboard/history/report call,
-- by jcb_user_id for per-vehicle filters, and by start_time for date ranges
CREATE INDEX IF NOT EXISTS idx_work_logs_worker_id    ON work_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_jcb_user_id  ON work_logs(jcb_user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_start_time   ON work_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_work_logs_status       ON work_logs(status);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_worker_id     ON payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_jcb_user_id   ON payments(jcb_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date  ON payments(payment_date);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_user_id       ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date          ON expenses(date);

-- invoices / invoice_items / invoice_payments
CREATE INDEX IF NOT EXISTS idx_invoices_supervisor_id     ON invoices(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id         ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id   ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

-- jcb_settlements
CREATE INDEX IF NOT EXISTS idx_jcb_settlements_jcb_user_id   ON jcb_settlements(jcb_user_id);
CREATE INDEX IF NOT EXISTS idx_jcb_settlements_supervisor_id ON jcb_settlements(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_jcb_settlements_date          ON jcb_settlements(settlement_date);
