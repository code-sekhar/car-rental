-- Match the exclusion constraint: pending holds remain blocking until explicitly expired.
-- Do not base a cross-table integrity guard on a second clock source.
CREATE OR REPLACE FUNCTION veltrix_check_availability_bookings() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM "Vehicle" WHERE id=NEW."vehicleId" FOR UPDATE;
 IF EXISTS (SELECT 1 FROM "Booking" b WHERE b."vehicleId"=NEW."vehicleId" AND b."pickupAt"<NEW."endsAt" AND b."returnAt">NEW."startsAt" AND b.status IN ('CONFIRMED','ACTIVE','PENDING_PAYMENT')) THEN
  RAISE EXCEPTION 'A reservation overlaps this block' USING ERRCODE='23P01', CONSTRAINT='Availability_conflicts_booking';
 END IF;
 RETURN NEW;
END $$;
