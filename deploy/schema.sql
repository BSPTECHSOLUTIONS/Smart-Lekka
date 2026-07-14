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
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  mobile     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id    INTEGER REFERENCES users(id),
  client_id  INTEGER REFERENCES clients(id)
);

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
