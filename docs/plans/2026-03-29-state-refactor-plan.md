# State Management Refactor: Custom Hooks + React Hook Form

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate scattered `useState` chaos by extracting custom hooks and using React Hook Form for complex forms, improving readability and reducing re-render overhead.

**Architecture:** Three-layer approach:
1. **Custom hooks** for non-form state (async operations, wizard steps, filter state)
2. **React Hook Form + Zod** for complex forms with validation
3. **Logical state grouping** via `useReducer` where appropriate

**Tech Stack:** react-hook-form (needs install), zod (already in @payslip/core)

---

## Phase 1: Infrastructure

### Task 1: Install react-hook-form

**Files:**
- Modify: `package.json`

**Step 1: Add react-hook-form dependency**

Run: `cd /Users/daffa.romeromekari.com/Codebase/personal/payslip && npm install react-hook-form`

**Step 2: Verify installation**

Run: `npm list react-hook-form`
Expected: react-hook-form version listed

---

### Task 2: Create `useAsyncOperation` hook

**Files:**
- Create: `src/lib/hooks/use-async-operation.ts`

**Step 1: Write the test**

```typescript
import { renderHook, act } from '@testing-library/react'
import { useAsyncOperation } from './use-async-operation'

describe('useAsyncOperation', () => {
  it('should track idle/loading/error states', async () => {
    const { result } = renderHook(() =>
      useAsyncOperation(async () => {
        await new Promise(r => setTimeout(r, 10))
        return 'success'
      })
    )

    expect(result.current.status).toBe('idle')
    
    let resolve: (v: string) => void
    const promise = new Promise<string>(r => { resolve = r })
    
    const { result: hook } = renderHook(() =>
      useAsyncOperation(() => promise)
    )
    
    await act(async () => {
      hook.current.execute()
    })
    
    expect(hook.current.status).toBe('loading')
    
    await act(async () => {
      resolve!('done')
    })
    
    expect(hook.current.status).toBe('success')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/hooks/use-async-operation.test.ts`
Expected: FAIL - file does not exist

**Step 3: Write minimal implementation**

```typescript
// src/lib/hooks/use-async-operation.ts
'use client'

import { useState, useCallback } from 'react'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useAsyncOperation<T, Args extends unknown[] = unknown[]>(
  fn: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
) {
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  const execute = useCallback(async (...args: Args) => {
    setStatus('loading')
    setError(null)
    try {
      const result = await fn(...args)
      setData(result)
      setStatus('success')
      options.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setStatus('error')
      options.onError?.(error)
      throw error
    }
  }, [fn, options.onSuccess, options.onError])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setData(null)
  }, [])

  return {
    status,
    error,
    data,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    execute,
    reset,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/hooks/use-async-operation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/hooks/use-async-operation.ts src/lib/hooks/use-async-operation.test.ts package.json package-lock.json
git commit -m "feat: add useAsyncOperation hook for unified async state management"
```

---

### Task 3: Create `useProrateConfig` hook

**Files:**
- Create: `src/lib/hooks/use-prorate-config.ts`

**Step 1: Write the test**

```typescript
import { renderHook, act } from '@testing-library/react'
import { useProrateConfig } from './use-prorate-config'

describe('useProrateConfig', () => {
  it('should toggle prorate on/off', () => {
    const { result } = renderHook(() => useProrateConfig())
    
    expect(result.current.enabled).toBe(false)
    
    act(() => result.current.toggle())
    expect(result.current.enabled).toBe(true)
    
    act(() => result.current.toggle())
    expect(result.current.enabled).toBe(false)
  })

  it('should update individual fields', () => {
    const { result } = renderHook(() => useProrateConfig())
    
    act(() => result.current.setType('resign'))
    expect(result.current.prorateType).toBe('resign')
    
    act(() => result.current.setCalcMode('span'))
    expect(result.current.prorateCalcMode).toBe('span')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/hooks/use-prorate-config.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/lib/hooks/use-prorate-config.ts
'use client'

import { useState, useCallback } from 'react'

export type ProrateType = 'join' | 'resign'
export type ProrateCalcMode = 'period' | 'span'

export interface ProrateConfig {
  enabled: boolean
  prorateType: ProrateType
  prorateDate: string
  prorateCalcMode: ProrateCalcMode
  prorateUseCount: boolean
  prorateCount: number
  prorateDayBasis: 'calendar' | 'working'
}

const DEFAULT_CONFIG: ProrateConfig = {
  enabled: false,
  prorateType: 'join',
  prorateDate: '',
  prorateCalcMode: 'period',
  prorateUseCount: false,
  prorateCount: 1,
  prorateDayBasis: 'calendar',
}

export function useProrateConfig() {
  const [config, setConfig] = useState<ProrateConfig>(DEFAULT_CONFIG)

  const toggle = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  const setType = useCallback((type: ProrateType) => {
    setConfig(prev => ({ ...prev, prorateType: type }))
  }, [])

  const setCalcMode = useCallback((mode: ProrateCalcMode) => {
    setConfig(prev => ({ 
      ...prev, 
      prorateCalcMode: mode,
      prorateUseCount: false 
    }))
  }, [])

  const setUseCount = useCallback((useCount: boolean) => {
    setConfig(prev => ({ ...prev, prorateUseCount: useCount }))
  }, [])

  const setCount = useCallback((count: number) => {
    setConfig(prev => ({ ...prev, prorateCount: count }))
  }, [])

  const setDayBasis = useCallback((basis: 'calendar' | 'working') => {
    setConfig(prev => ({ ...prev, prorateDayBasis: basis }))
  }, [])

  const setDate = useCallback((date: string) => {
    setConfig(prev => ({ ...prev, prorateDate: date }))
  }, [])

  const reset = useCallback(() => {
    setConfig(DEFAULT_CONFIG)
  }, [])

  return {
    ...config,
    toggle,
    setType,
    setCalcMode,
    setUseCount,
    setCount,
    setDayBasis,
    setDate,
    reset,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/hooks/use-prorate-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/hooks/use-prorate-config.ts src/lib/hooks/use-prorate-config.test.ts
git commit -m "feat: add useProrateConfig hook for prorate state management"
```

---

## Phase 2: Refactor `generate/form.tsx`

### Task 4: Create Zod schema for payslip form

**Files:**
- Create: `src/lib/schemas/payslip-form.ts`

**Step 1: Write the schema**

```typescript
import { z } from 'zod'

const AllowanceSchema = z.object({
  name: z.string(),
  amount: z.number().min(0),
})

const DeductionSchema = z.object({
  name: z.string(),
  amount: z.number().min(0),
})

export const PayslipFormSchema = z.object({
  employeeId: z.string().min(1, 'Pilih karyawan'),
  templateId: z.string().min(1, 'Pilih template'),
  periodType: z.enum(['weekly', 'monthly', 'quarterly', 'semi-annual', 'annual']),
  startDate: z.string().min(1, 'Masukkan tanggal mulai'),
  endDate: z.string().min(1, 'Masukkan tanggal selesai'),
  basePay: z.number().min(0),
  overtimeHours: z.number().min(0).default(0),
  hourlyRate: z.number().min(0).default(0),
  bonus: z.number().min(0).default(0),
  thr: z.number().min(0).default(0),
  allowances: z.array(AllowanceSchema).default([]),
  deductions: z.array(DeductionSchema).default([]),
  notes: z.string().default(''),
})

export type PayslipFormValues = z.infer<typeof PayslipFormSchema>
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit src/lib/schemas/payslip-form.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/schemas/payslip-form.ts
git commit -m "feat: add PayslipFormSchema for form validation"
```

---

### Task 5: Refactor generate/form.tsx to use RHF + hooks

**Files:**
- Modify: `src/app/generate/form.tsx`

**Step 1: Write the transformed component (overview)**

The refactored component will:
- Use `useForm` from react-hook-form instead of 20+ useState calls
- Use `useAsyncOperation` for generate/preview/download operations
- Use `useProrateConfig` for prorate state
- Keep form values as a single `form.watch()` subscription

Key changes:
- Replace 26 useStates with `const { register, watch, setValue, handleSubmit } = useForm<PayslipFormValues>({ resolver: zodResolver(PayslipFormSchema), defaultValues: {...} })`
- Replace `loading`, `generatedId`, `downloadingPdf`, `previewingSrc`, `loadingPreview` with `const generateOp = useAsyncOperation(...)`
- Replace 8 prorate states with `const prorate = useProrateConfig()`

**Step 2: Commit incremental**

```bash
git add src/app/generate/form.tsx
git commit -m "refactor(generate/form): replace 26 useStates with react-hook-form + custom hooks"
```

---

## Phase 3: Refactor `data/page.tsx`

### Task 6: Create `useImportWizard` hook

**Files:**
- Create: `src/lib/hooks/use-import-wizard.ts`

**Step 1: Write the test**

```typescript
import { renderHook, act } from '@testing-library/react'
import { useImportWizard } from './use-import-wizard'

describe('useImportWizard', () => {
  it('should manage import step transitions', () => {
    const { result } = renderHook(() => useImportWizard())
    
    expect(result.current.step).toBe('upload')
    
    act(() => result.current.goToStep('map'))
    expect(result.current.step).toBe('map')
    
    act(() => result.current.reset())
    expect(result.current.step).toBe('upload')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/hooks/use-import-wizard.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// src/lib/hooks/use-import-wizard.ts
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/hooks/use-import-wizard.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/hooks/use-import-wizard.ts src/lib/hooks/use-import-wizard.test.ts
git commit -m "feat: add useImportWizard hook for import wizard state"
```

---

### Task 7: Refactor data/page.tsx

**Files:**
- Modify: `src/app/data/page.tsx`

**Step 1: Verify current tests exist**

Run: `npm test -- --run src/app/data/page.tsx` (or equivalent)
Expected: Check if import/export functionality is tested

**Step 2: Apply refactor**

Replace the 10 useState calls with a single `const wizard = useImportWizard()` call.

**Step 3: Run linter**

Run: `npm run lint -- src/app/data/page.tsx`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/data/page.tsx
git commit -m "refactor(data/page): replace 10 useStates with useImportWizard hook"
```

---

## Phase 4: Additional Components

### Task 8: Refactor payslips/page.tsx

**Files:**
- Modify: `src/app/payslips/page.tsx`

This page has:
- `payslips`, `total`, `loading`, `employees` - data fetching state
- `filterEmployee`, `filterYear`, `filterMonth` - filter state
- `pendingDelete`, `deletingId`, `downloadingId`, `previewingId`, `previewSrc`, `previewFilename`, `emailingId`, `whatsappingId` - 8 UI action states

**Step 1: Create `usePayslipFilters` hook**

Extract filter state into `src/lib/hooks/use-payslip-filters.ts`

**Step 2: Replace action states with useAsyncOperation**

Replace 8 `*ingId` states with 2-3 `useAsyncOperation` hooks (one per action type: delete, download, preview, email, whatsapp)

**Step 3: Commit**

```bash
git add src/lib/hooks/use-payslip-filters.ts src/app/payslips/page.tsx
git commit -m "refactor(payslips/page): extract filters and async operations to hooks"
```

---

### Task 9: Refactor employees/page.tsx

**Files:**
- Modify: `src/app/employees/page.tsx`

This page has:
- `employees`, `loading`, `q` - data + search
- `deletingId`, `pendingDelete` - 2 action states

**Step 1: Apply similar pattern**

Extract `useEmployeeFilters` if needed, use `useAsyncOperation` for delete

**Step 2: Commit**

```bash
git add src/app/employees/page.tsx
git commit -m "refactor(employees/page): simplify state with hooks"
```

---

## Summary

| File | Before | After |
|------|--------|-------|
| `generate/form.tsx` | 26 useState | 1 useForm + 2 custom hooks |
| `data/page.tsx` | 10 useState | 1 useImportWizard + 2 useAsyncOperation |
| `payslips/page.tsx` | 14 useState | 1 usePayslipFilters + 3 useAsyncOperation |
| `employees/page.tsx` | 5 useState | 1 useEmployeeFilters + 1 useAsyncOperation |

**New hooks created:**
- `useAsyncOperation` - generic async state machine
- `useProrateConfig` - prorate settings
- `useImportWizard` - import flow state
- `usePayslipFilters` - payslip list filters
