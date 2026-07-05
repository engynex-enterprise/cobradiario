-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "phone2" TEXT;

-- CreateTable
CREATE TABLE "guarantors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentId" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "relationship" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "guarantors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guarantors_tenantId_idx" ON "guarantors"("tenantId");

-- CreateIndex
CREATE INDEX "guarantors_clientId_idx" ON "guarantors"("clientId");

-- AddForeignKey
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS multi-tenant (mismo patrón que la migración base).
ALTER TABLE "guarantors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "guarantors" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "guarantors"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "guarantors" TO app_user;
