import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate } from './utils'
import { escapeHtml } from './pdf/generator'

describe('cn', () => {
  it('merges class names with clsx and tailwind-merge', () => {
    const result = cn('text-red-500', 'bg-blue-500')
    expect(result).toBe('text-red-500 bg-blue-500')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toBe('base-class active-class')
  })

  it('merges tailwind classes with conflicting properties', () => {
    const result = cn('text-red-500 text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('handles empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })
})

describe('formatCurrency', () => {
  it('formats positive numbers as IDR currency', () => {
    expect(formatCurrency(1000000)).toContain('1.000.000')
    expect(formatCurrency(1000000)).toContain('Rp')
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toContain('0')
    expect(formatCurrency(0)).toContain('Rp')
  })

  it('formats large numbers with proper separators', () => {
    expect(formatCurrency(1000000000)).toContain('1.000.000.000')
  })

  it('handles small decimal amounts (rounds to whole number)', () => {
    expect(formatCurrency(1500000.75)).toContain('1.500.001')
  })

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-500000)).toContain('500.000')
  })

  it('formats Indonesian month names', () => {
    const date = new Date('2024-01-15')
    expect(formatDate(date)).toContain('Januari')
  })

  it('formats different months correctly', () => {
    expect(formatDate(new Date('2024-02-20'))).toContain('Februari')
    expect(formatDate(new Date('2024-03-10'))).toContain('Maret')
    expect(formatDate(new Date('2024-04-05'))).toContain('April')
    expect(formatDate(new Date('2024-05-25'))).toContain('Mei')
    expect(formatDate(new Date('2024-06-15'))).toContain('Juni')
    expect(formatDate(new Date('2024-07-01'))).toContain('Juli')
    expect(formatDate(new Date('2024-08-12'))).toContain('Agustus')
    expect(formatDate(new Date('2024-09-20'))).toContain('September')
    expect(formatDate(new Date('2024-10-08'))).toContain('Oktober')
    expect(formatDate(new Date('2024-11-30'))).toContain('November')
    expect(formatDate(new Date('2024-12-25'))).toContain('Desember')
  })
})

describe('formatDate', () => {
  it('formats standard date in Indonesian locale', () => {
    const date = new Date('2024-07-15')
    expect(formatDate(date)).toBe('15 Juli 2024')
  })

  it('formats different years correctly', () => {
    expect(formatDate(new Date('2023-01-01'))).toBe('1 Januari 2023')
    expect(formatDate(new Date('2025-12-31'))).toBe('31 Desember 2025')
  })

  it('accepts string date input', () => {
    expect(formatDate('2024-06-20')).toBe('20 Juni 2024')
  })

  it('formats date with single digit day and month', () => {
    expect(formatDate(new Date('2024-01-05'))).toBe('5 Januari 2024')
  })
})

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('escapes less than sign', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes greater than sign', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('Say "Hello"')).toBe('Say &quot;Hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("It's working")).toBe('It&#39;s working')
  })

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('leaves normal text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })

  it('handles strings with multiple special characters', () => {
    expect(escapeHtml('A & B < C > D "E" & \'F\'')).toBe('A &amp; B &lt; C &gt; D &quot;E&quot; &amp; &#39;F&#39;')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('handles employee name with special characters', () => {
    expect(escapeHtml('Johan "The Boss" O\'Reilly & Partners')).toBe('Johan &quot;The Boss&quot; O&#39;Reilly &amp; Partners')
  })
})
