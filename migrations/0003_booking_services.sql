UPDATE services SET active=0 WHERE id IN ('sweep-chimney','sweep-open-fire','sweep-multifuel','sweep-log-burner','stove-installation');

INSERT OR REPLACE INTO services(id,name,description,price_label,duration_minutes,active,sort_order) VALUES
  ('free-installation-survey','Free Installation Survey','Free home survey for stove installation.','Free',60,1,10),
  ('chimney-sweep','Chimney Sweep','Chimney Sweep which includes covers sheeting up fire, rotary or manual sweep, vacuum clean, smoke evacuation check, certificate.','£65 - £90',75,1,20),
  ('chimney-sweep-2','Chimney Sweep x 2','For sweeping 2 chimneys.','£120 - £170',105,1,30),
  ('chimney-sweep-3','Chimney Sweep x 3','For sweeping 3 chimneys.','£175 - £250',150,1,40),
  ('chimney-sweep-4','Chimney Sweep x 4','For sweeping 4 chimneys.','£230 - £330',195,1,50),
  ('chimney-sweep-cctv','Chimney Sweep & CCTV Inspection','Chimney Sweep which includes covers sheeting up fire, rotary or manual sweep, vacuum clean, smoke evacuation check, certificate. CCTV Inspection to check condition of flue/chimney or blockages.','£125 - £150',120,1,60),
  ('cctv-inspection','CCTV Inspection','CCTV Inspection to check condition of flue/chimney or blockages.','£60',60,1,70),
  ('other','Other (Do not select, if not listed above call or sms)','Do not select. If your service is not listed above, call or SMS us.','Free',15,1,80);

-- The booking engine now uses 15-minute availability slots. Backfill existing bookings so their previously reserved 30-minute slots also block the new quarter-hour slots.
WITH RECURSIVE slots(booking_id,date,slot_time,end_time) AS (
  SELECT id,date,start_time,end_time FROM bookings WHERE status <> 'cancelled'
  UNION ALL
  SELECT booking_id,date,substr(time(slot_time,'+15 minutes'),1,5),end_time
  FROM slots
  WHERE time(slot_time,'+15 minutes') < end_time
)
INSERT OR IGNORE INTO booking_slots(date,slot_time,booking_id)
SELECT date,slot_time,booking_id FROM slots;
