-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifyExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifyTokenHash" TEXT;

-- Backfill: los usuarios existentes quedan verificados (no bloquear login).
UPDATE "users" SET "emailVerifiedAt" = now() WHERE "emailVerifiedAt" IS NULL;
