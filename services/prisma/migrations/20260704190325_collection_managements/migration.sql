-- CreateEnum
CREATE TYPE "ManagementType" AS ENUM ('CALL', 'VISIT', 'SMS', 'WHATSAPP', 'EMAIL', 'OTHER');

-- CreateTable
CREATE TABLE "collection_managements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "type" "ManagementType" NOT NULL,
    "result" TEXT,
    "note" TEXT,
    "promiseAmount" DECIMAL(18,2),
    "promiseDate" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "followUpNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_managements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_managements_tenantId_loanId_createdAt_idx" ON "collection_managements"("tenantId", "loanId", "createdAt");

-- AddForeignKey
ALTER TABLE "collection_managements" ADD CONSTRAINT "collection_managements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_managements" ADD CONSTRAINT "collection_managements_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS multi-tenant para la tabla nueva (mismo patrón que la migración base).
ALTER TABLE "collection_managements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collection_managements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "collection_managements"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON "collection_managements" TO app_user;
