'use client'
import React from 'react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number
  onChange: (value: number) => void
}

/**
 * <input type="number"> that allows fully clearing the field.
 *
 * Without this wrapper, pressing Backspace/Delete makes the browser emit '',
 * Number('') = 0 immediately re-fills the field, and the user can never
 * clear a value to type a new one.
 *
 * - Shows empty string when value is 0 (so the field is visually blank)
 * - Reports 0 to onChange when the field is cleared
 * - Enforces min/max on blur, not on every keystroke — so typing is not blocked
 */
export function NumberInput({ value, onChange, min, max, onBlur, ...props }: Props) {
  return (
    <input
      type="number"
      value={value || ''}
      onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      onBlur={e => {
        if (min != null && value < Number(min)) onChange(Number(min))
        else if (max != null && value > Number(max)) onChange(Number(max))
        onBlur?.(e)
      }}
      min={min}
      max={max}
      {...props}
    />
  )
}
