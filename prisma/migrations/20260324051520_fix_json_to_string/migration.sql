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
    "bpjsKetenagakerjaan" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_Payslip" ("allowances", "basePay", "bonus", "bpjsKesehatan", "bpjsKetenagakerjaan", "companyId", "employeeId", "endDate", "generatedAt", "grossPay", "id", "netPay", "notes", "otherDeductions", "overtimeHours", "overtimePay", "pdfUrl", "periodType", "pph21", "startDate", "templateId", "thr", "totalDeductions", "ytdGross", "ytdPph21") SELECT "allowances", "basePay", "bonus", "bpjsKesehatan", "bpjsKetenagakerjaan", "companyId", "employeeId", "endDate", "generatedAt", "grossPay", "id", "netPay", "notes", "otherDeductions", "overtimeHours", "overtimePay", "pdfUrl", "periodType", "pph21", "startDate", "templateId", "thr", "totalDeductions", "ytdGross", "ytdPph21" FROM "Payslip";
DROP TABLE "Payslip";
ALTER TABLE "new_Payslip" RENAME TO "Payslip";
CREATE INDEX "Payslip_companyId_idx" ON "Payslip"("companyId");
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");
CREATE INDEX "Payslip_periodType_idx" ON "Payslip"("periodType");
CREATE INDEX "Payslip_startDate_idx" ON "Payslip"("startDate");
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "layout" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "sections" TEXT NOT NULL,
    "header" TEXT NOT NULL,
    "customFields" TEXT,
    "customCss" TEXT,
    "language" TEXT NOT NULL DEFAULT 'id',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Template_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Template" ("companyId", "createdAt", "customCss", "customFields", "header", "id", "isDefault", "language", "layout", "name", "sections", "theme", "type", "updatedAt") SELECT "companyId", "createdAt", "customCss", "customFields", "header", "id", "isDefault", "language", "layout", "name", "sections", "theme", "type", "updatedAt" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
CREATE INDEX "Template_companyId_idx" ON "Template"("companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
