-- DropForeignKey
ALTER TABLE "loans" DROP CONSTRAINT "loans_productId_fkey";

-- AlterTable
ALTER TABLE "loans" ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "credit_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
