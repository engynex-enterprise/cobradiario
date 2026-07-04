-- CreateEnum
CREATE TYPE "BaseType" AS ENUM ('RECEIVED', 'DELIVERED');

-- CreateTable
CREATE TABLE "base_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "routeId" TEXT,
    "type" "BaseType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "base_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "base_movements_tenantId_createdAt_idx" ON "base_movements"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "base_movements" ADD CONSTRAINT "base_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS multi-tenant (mismo patrón que la migración base).
ALTER TABLE "base_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "base_movements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "base_movements"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "base_movements" TO app_user;
