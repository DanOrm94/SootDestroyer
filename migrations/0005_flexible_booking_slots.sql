DROP TABLE booking_slots;

CREATE TABLE booking_slots (
  date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  PRIMARY KEY (date, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_booking ON booking_slots(booking_id);

WITH RECURSIVE slots(booking_id,date,slot_time,end_time) AS (
  SELECT id,date,start_time,end_time
  FROM bookings
  WHERE status <> 'cancelled'
  UNION ALL
  SELECT booking_id,date,substr(time(slot_time,'+5 minutes'),1,5),end_time
  FROM slots
  WHERE time(slot_time,'+5 minutes') < end_time
)
INSERT OR IGNORE INTO booking_slots(date,slot_time,booking_id)
SELECT date,slot_time,booking_id
FROM slots;

PRAGMA foreign_key_check;
