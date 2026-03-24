import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

config({ path: resolve(__dirname, '../.env') })

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'
console.log('Using database URL:', databaseUrl)

const adapter = new PrismaLibSql({ url: databaseUrl })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create default company
  const company = await prisma.company.create({
    data: {
      name: 'PT Contoh Indonesia',
      address: 'Jl. Sudirman No. 1, Jakarta Pusat',
      taxId: '09.123.456.7-123.000',
      phone: '(021) 1234-5678',
      email: 'hr@contoh.co.id',
    },
  })

  // Create preset templates
  const standardTemplate = await prisma.template.create({
    data: {
      companyId: company.id,
      name: 'Standar',
      type: 'preset',
      isDefault: true,
      language: 'id',
      layout: {
        orientation: 'portrait',
        pageSize: 'A4',
        columns: 1,
      },
      theme: {
        primaryColor: '#1e293b',
        secondaryColor: '#64748b',
        fontFamily: 'inter',
        fontSize: 'medium',
      },
      sections: {
        companyHeader: true,
        employeeInfo: true,
        earnings: true,
        deductions: true,
        netPay: true,
        ytdSummary: true,
        bankDetails: true,
        notes: true,
        signature: false,
      },
      header: {
        showLogo: false,
        companyName: 'PT Contoh Indonesia',
        companyAddress: 'Jl. Sudirman No. 1, Jakarta Pusat',
        companyTaxId: '09.123.456.7-123.000',
        companyPhone: '(021) 1234-5678',
        companyEmail: 'hr@contoh.co.id',
      },
      customFields: [],
    },
  })

  const modernTemplate = await prisma.template.create({
    data: {
      companyId: company.id,
      name: 'Modern',
      type: 'preset',
      isDefault: false,
      language: 'id',
      layout: {
        orientation: 'portrait',
        pageSize: 'A4',
        columns: 1,
      },
      theme: {
        primaryColor: '#0ea5e9',
        secondaryColor: '#7dd3fc',
        fontFamily: 'inter',
        fontSize: 'medium',
      },
      sections: {
        companyHeader: true,
        employeeInfo: true,
        earnings: true,
        deductions: true,
        netPay: true,
        ytdSummary: false,
        bankDetails: true,
        notes: false,
        signature: true,
      },
      header: {
        showLogo: false,
        companyName: 'PT Contoh Indonesia',
        companyAddress: 'Jl. Sudirman No. 1, Jakarta Pusat',
      },
      customFields: [],
    },
  })

  console.log('Database seeded!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
