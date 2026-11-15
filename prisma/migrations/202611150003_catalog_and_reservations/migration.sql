-- CreateEnum
CREATE TYPE "CancellationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "draftExpiresAt" TIMESTAMPTZ(3),
ADD COLUMN     "initialRequestHash" TEXT,
ADD COLUMN     "requestedCouponCode" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "BookingDriver" ADD COLUMN     "ageConfirmedAt" TIMESTAMPTZ(3),
ALTER COLUMN "encryptedLicense" DROP NOT NULL;

-- AlterTable
ALTER TABLE "BookingPriceSnapshot" ADD COLUMN     "taxRateBps" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CancellationRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CancellationStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPolicy" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "taxRateBps" INTEGER NOT NULL,
    "holdMinutes" INTEGER NOT NULL,
    "maxRentalDays" INTEGER NOT NULL,
    "maxAdvanceDays" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PricingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CancellationRequest_bookingId_key" ON "CancellationRequest"("bookingId");

-- CreateIndex
CREATE INDEX "CancellationRequest_userId_status_idx" ON "CancellationRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingExtra" ADD COLUMN "perDaySnapshot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pending_has_expiry" CHECK ("status" <> 'PENDING_PAYMENT' OR "holdExpiresAt" IS NOT NULL);
ALTER TABLE "PricingPolicy" ADD CONSTRAINT "PricingPolicy_valid" CHECK ("taxRateBps" BETWEEN 0 AND 10000 AND "holdMinutes" BETWEEN 1 AND 60 AND "maxRentalDays" BETWEEN 1 AND 365 AND "maxAdvanceDays" BETWEEN 1 AND 3650);
CREATE INDEX "Vehicle_status_price_idx" ON "Vehicle" ("status", "dailyPriceCents", "id");
CREATE INDEX "Vehicle_status_specs_idx" ON "Vehicle" ("status", "transmission", "fuel", "seats");
CREATE INDEX "Booking_user_status_pickup_idx" ON "Booking" ("userId", "status", "pickupAt");
-- Locking the parent vehicle makes cross-table maintenance/booking rules atomic.
CREATE FUNCTION veltrix_check_booking_blocks() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."status" IN ('PENDING_PAYMENT','CONFIRMED','ACTIVE') THEN
  PERFORM 1 FROM "Vehicle" WHERE id=NEW."vehicleId" FOR UPDATE;
  IF EXISTS (SELECT 1 FROM "VehicleAvailability" a WHERE a."vehicleId"=NEW."vehicleId" AND a."startsAt"<NEW."returnAt" AND a."endsAt">NEW."pickupAt") THEN
   RAISE EXCEPTION 'Vehicle is blocked during this period' USING ERRCODE='23P01', CONSTRAINT='Booking_blocked_period';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_respects_blocks BEFORE INSERT OR UPDATE OF "vehicleId","pickupAt","returnAt","status" ON "Booking" FOR EACH ROW EXECUTE FUNCTION veltrix_check_booking_blocks();
CREATE FUNCTION veltrix_check_availability_bookings() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM "Vehicle" WHERE id=NEW."vehicleId" FOR UPDATE;
 IF EXISTS (SELECT 1 FROM "Booking" b WHERE b."vehicleId"=NEW."vehicleId" AND b."pickupAt"<NEW."endsAt" AND b."returnAt">NEW."startsAt" AND (b.status IN ('CONFIRMED','ACTIVE') OR (b.status='PENDING_PAYMENT' AND b."holdExpiresAt">clock_timestamp()))) THEN
  RAISE EXCEPTION 'A reservation overlaps this block' USING ERRCODE='23P01', CONSTRAINT='Availability_conflicts_booking';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER availability_respects_bookings BEFORE INSERT OR UPDATE OF "vehicleId","startsAt","endsAt" ON "VehicleAvailability" FOR EACH ROW EXECUTE FUNCTION veltrix_check_availability_bookings();
