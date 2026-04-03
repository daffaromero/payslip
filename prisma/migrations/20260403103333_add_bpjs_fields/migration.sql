/*
  Warnings:

  - You are about to drop the column `bpjsKetenagakerjaan` on the `Payslip` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "salaryComponents" TEXT;

-- AlterTable
ALTER TABLE "Template" ADD COLUMN "footer" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payslip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "basePay" REAL NOT NULL,
    "overtimeHours" REAL,
    "overtimePay" REAL NOT NULL DEFAULT 0,
    "bonus" REAL NOT NULL DEFAULT 0,
    "thr" REAL NOT NULL DEFAULT 0,
    "allowances" TEXT NOT NULL,
    "pph21" REAL NOT NULL DEFAULT 0,
    "bpjsKesehatan" REAL NOT NULL DEFAULT 0,
    "bpjsTkJht" REAL NOT NULL DEFAULT 0,
    "bpjsTkJp" REAL NOT NULL DEFAULT 0,
    "otherDeductions" TEXT NOT NULL,
    "grossPay" REAL NOT NULL,
    "totalDeductions" REAL NOT NULL,
    "netPay" REAL NOT NULL,
    "ytdGross" REAL NOT NULL DEFAULT 0,
    "ytdPph21" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfUrl" TEXT,
    CONSTRAINT "Payslip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payslip_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Payslip" ("allowances", "basePay", "bonus", "bpjsKesehatan", "companyId", "employeeId", "endDate", "generatedAt", "grossPay", "id", "netPay", "notes", "otherDeductions", "overtimeHours", "overtimePay", "pdfUrl", "periodType", "pph21", "startDate", "templateId", "thr", "totalDeductions", "ytdGross", "ytdPph21") SELECT "allowances", "basePay", "bonus", "bpjsKesehatan", "companyId", "employeeId", "endDate", "generatedAt", "grossPay", "id", "netPay", "notes", "otherDeductions", "overtimeHours", "overtimePay", "pdfUrl", "periodType", "pph21", "startDate", "templateId", "thr", "totalDeductions", "ytdGross", "ytdPph21" FROM "Payslip";
DROP TABLE "Payslip";
ALTER TABLE "new_Payslip" RENAME TO "Payslip";
CREATE INDEX "Payslip_companyId_idx" ON "Payslip"("companyId");
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");
CREATE INDEX "Payslip_periodType_idx" ON "Payslip"("periodType");
CREATE INDEX "Payslip_startDate_idx" ON "Payslip"("startDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
