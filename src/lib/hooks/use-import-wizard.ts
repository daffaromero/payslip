'use client'

import { useState, useCallback } from 'react'

export type ImportStep = 'upload' | 'map' | 'preview' | 'done'

interface ParsedFile {
  headers: string[]
  rows: Record<string, string | number | null>[]
  totalRows: number
  autoMappings: Record<string, string>
}

interface PreviewRow {
  data: Record<string, string | number | boolean | null>
  errors: string[]
  valid: boolean
}

interface ImportResult {
  created: number
  skipped: number
  errors: { row: number; errors: string[] }[]
}

interface ImportState {
  step: ImportStep
  parsedFile: ParsedFile | null
  mappings: Record<string, string>
  previewRows: PreviewRow[]
  totalValid: number
  totalInvalid: number
  result: ImportResult | null
}

const INITIAL_STATE: ImportState = {
  step: 'upload',
  parsedFile: null,
  mappings: {},
  previewRows: [],
  totalValid: 0,
  totalInvalid: 0,
  result: null,
}

export function useImportWizard() {
  const [state, setState] = useState<ImportState>(INITIAL_STATE)

  const goToStep = useCallback((step: ImportStep) => {
    setState(prev => ({ ...prev, step }))
  }, [])

  const setParsedFile = useCallback((parsedFile: ParsedFile) => {
    setState(prev => ({
      ...prev,
      parsedFile,
      mappings: parsedFile.autoMappings ?? {},
    }))
  }, [])

  const setMappings = useCallback((mappings: Record<string, string>) => {
    setState(prev => ({ ...prev, mappings }))
  }, [])

  const setPreviewResults = useCallback((
    previewRows: PreviewRow[],
    totalValid: number,
    totalInvalid: number
  ) => {
    setState(prev => ({ ...prev, previewRows, totalValid, totalInvalid }))
  }, [])

  const setResult = useCallback((result: ImportResult) => {
    setState(prev => ({ ...prev, result }))
  }, [])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return {
    ...state,
    goToStep,
    setParsedFile,
    setMappings,
    setPreviewResults,
    setResult,
    reset,
  }
}
