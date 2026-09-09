-- The original bookings table only allowed confirmed/completed/cancelled.
-- Rebuild it so online requests can remain pending until Liam confirms them.
CREATE TABLE bookings_new (
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO bookings_new (
  id, service_id, date, start_time, end_time, name, phone, email,
  address, postcode, notes, status, created_at, updated_at
)
SELECT
  id, service_id, date, start_time, end_time, name, phone, email,
  address, postcode, notes, status, created_at, updated_at
FROM bookings;

-- Rebuild the slot table as well so existing reservations can be backfilled
-- using the current 15-minute slot system.
DROP TABLE booking_slots;
DROP TABLE bookings;
ALTER TABLE bookings_new RENAME TO bookings;

CREATE TABLE booking_slots (
  date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  PRIMARY KEY (date, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date, start_time);
CREATE INDEX IF NOT EXISTS idx_booking_slots_booking ON booking_slots(booking_id);

-- Rebuild all quarter-hour reservations for existing non-cancelled bookings.
WITH RECURSIVE slots(booking_id,date,slot_time,end_time) AS (
  SELECT id,date,start_time,end_time
  FROM bookings
  WHERE status <> 'cancelled'
  UNION ALL
  SELECT booking_id,date,substr(time(slot_time,'+15 minutes'),1,5),end_time
  FROM slots
  WHERE time(slot_time,'+15 minutes') < end_time
)
INSERT OR IGNORE INTO booking_slots(date,slot_time,booking_id)
SELECT date,slot_time,booking_id
FROM slots;

PRAGMA foreign_key_check;
