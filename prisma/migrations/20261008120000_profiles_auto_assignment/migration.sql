ALTER TABLE "users" ADD COLUMN "googleSub" TEXT;
CREATE UNIQUE INDEX "users_googleSub_key" ON "users"("googleSub");
ALTER TABLE "categories" ADD COLUMN "defaultTechnicianId" TEXT;
CREATE INDEX "categories_defaultTechnicianId_idx" ON "categories"("defaultTechnicianId");
ALTER TABLE "categories" ADD CONSTRAINT "categories_defaultTechnicianId_fkey" FOREIGN KEY ("defaultTechnicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
