-- CreateTable
CREATE TABLE "employee_permissions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sections" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_permissions_memberId_key" ON "employee_permissions"("memberId");
