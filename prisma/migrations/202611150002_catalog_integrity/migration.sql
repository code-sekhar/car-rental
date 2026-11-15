ALTER TABLE "Vehicle" ADD COLUMN "popular" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "representativeImageUrl" TEXT,
ADD COLUMN "recommendationOrder" INTEGER;
ALTER TABLE "RentalLocation" DROP CONSTRAINT "Location_valid_coordinates";
ALTER TABLE "RentalLocation" ADD CONSTRAINT "Location_valid_coordinates" CHECK (
 ("latitude" IS NULL) = ("longitude" IS NULL)
 AND ("latitude" IS NULL OR ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)));
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_valid_discount";
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_valid_discount" CHECK (
 "expiresAt" > "startsAt" AND "minimumCents" >= 0 AND ("maxUses" IS NULL OR "maxUses" > 0)
 AND (("kind" = 'PERCENT' AND "discountBps" IS NOT NULL AND "discountBps" BETWEEN 1 AND 10000 AND "fixedAmountCents" IS NULL)
 OR ("kind" = 'FIXED' AND "fixedAmountCents" IS NOT NULL AND "fixedAmountCents" > 0 AND "discountBps" IS NULL)));
