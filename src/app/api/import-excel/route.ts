import { NextRequest, NextResponse } from 'next/server'
import { parseExcelFile, autoMapColumns } from '@/lib/excel/parser'
import { generateImportPreview } from '@/lib/excel/mapper'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'File tidak ditemukan' },
        { status: 400 }
      )
    }
    
    // Check file type
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Format file harus .xlsx, .xls, atau .csv' },
        { status: 400 }
      )
    }
    
    // Read file
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = parseExcelFile(buffer)
    
    // Auto-detect column mappings
    const autoMappings = autoMapColumns(result.headers)
    
    return NextResponse.json({
      success: true,
      headers: result.headers,
      preview: result.rows.slice(0, 5),
      totalRows: result.rows.length,
      autoMappings: Object.fromEntries(autoMappings),
      sheetNames: result.sheetNames,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Gagal memproses file' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  // Endpoint to preview import with custom mappings
  try {
    const { rows, mappings } = await request.json()
    
    const config = {
      mappings: Object.entries(mappings).map(([excelColumn, employeeField]) => ({
        excelColumn,
        employeeField: employeeField as string,
      })),
      defaultValues: {
        pph21Status: 'TK/0',
        isActive: true,
      },
    }
    
    const preview = generateImportPreview(rows, config)
    
    return NextResponse.json({
      success: true,
      preview: preview.slice(0, 10),
      totalValid: preview.filter(p => p.valid).length,
      totalInvalid: preview.filter(p => !p.valid).length,
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat preview' },
      { status: 500 }
    )
  }
}
