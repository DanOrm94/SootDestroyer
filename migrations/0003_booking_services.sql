ALTER TABLE services ADD COLUMN duration_label TEXT NOT NULL DEFAULT '';

UPDATE services SET active=0 WHERE id IN ('sweep-chimney','sweep-open-fire','sweep-multifuel','sweep-log-burner','stove-installation');

INSERT OR REPLACE INTO services(id,name,description,price_label,duration_minutes,duration_label,active,sort_order) VALUES
  ('free-installation-survey','Free Installation Survey','Free home survey for stove installation.','Free',60,'1 hr',1,10),
  ('chimney-sweep','Chimney Sweep','Chimney Sweep which includes covers sheeting up fire, rotary or manual sweep, vacuum clean, smoke evacuation check, certificate.','£65 - £90',75,'1 hr 15 mins',1,20),
  ('chimney-sweep-2','Chimney Sweep x 2','For sweeping 2 chimneys.','£120 - £170',105,'1 hr 45 mins',1,30),
  ('chimney-sweep-3','Chimney Sweep x 3','For sweeping 3 chimneys.','£175 - £250',150,'2 hrs 30 mins',1,40),
  ('chimney-sweep-4','Chimney Sweep x 4','For sweeping 4 chimneys.','£230 - £330',195,'3 hrs 15 mins',1,50),
  ('chimney-sweep-cctv','Chimney Sweep & CCTV Inspection','Chimney Sweep which includes covers sheeting up fire, rotary or manual sweep, vacuum clean, smoke evacuation check, certificate. CCTV Inspection to check condition of flue/chimney or blockages.','£125 - £150',120,'2 hrs',1,60),
  ('cctv-inspection','CCTV Inspection','CCTV Inspection to check condition of flue/chimney or blockages.','£60',60,'1 hr',1,70),
  ('other','Other (Do not select, if not listed above call or sms)','Do not select. If your service is not listed above, call or SMS us.','Free',15,'7 mins',1,80);
