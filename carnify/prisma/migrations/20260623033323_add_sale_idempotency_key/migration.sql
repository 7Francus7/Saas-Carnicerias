-- AlterTable
ALTER TABLE "sale" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sale_idempotencyKey_key" ON "sale"("idempotencyKey");
