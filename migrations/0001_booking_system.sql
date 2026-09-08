PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_label TEXT NOT NULL DEFAULT 'POA',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS business_hours (
  day_of_week INTEGER PRIMARY KEY,
  is_open INTEGER NOT NULL DEFAULT 0,
  open_time TEXT NOT NULL DEFAULT '09:00',
  close_time TEXT NOT NULL DEFAULT '17:00'
);

CREATE TABLE IF NOT EXISTS blocked_dates (
  date TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'Unavailable'
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id),
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','completed','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_slots (
  date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  PRIMARY KEY (date, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date, start_time);
CREATE INDEX IF NOT EXISTS idx_booking_slots_booking ON booking_slots(booking_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active, sort_order);

INSERT OR IGNORE INTO business_hours(day_of_week,is_open,open_time,close_time) VALUES
  (0,0,'09:00','17:00'),
  (1,1,'09:00','17:00'),
  (2,1,'09:00','17:00'),
  (3,1,'09:00','17:00'),
  (4,1,'09:00','17:00'),
  (5,1,'09:00','17:00'),
  (6,1,'09:00','17:00');

INSERT OR IGNORE INTO services(id,name,description,price_label,duration_minutes,active,sort_order) VALUES
  ('sweep-chimney','Chimney sweep','Professional chimney sweeping.','From £65',60,1,10),
  ('sweep-open-fire','Open fire','Open fire chimney sweep.','£65',60,1,20),
  ('sweep-multifuel','Multi-fuel stove','Price depends on whether the flue is lined.','£65 lined / £90 no lining',60,1,30),
  ('sweep-log-burner','Log burner stove','Price depends on whether the flue is lined.','£65 lined / £90 no lining',60,1,40),
  ('stove-installation','Stove installation','Installation appointment. Final price is confirmed after survey.','POA',120,1,50);
