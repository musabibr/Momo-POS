import React from 'react'
import { P } from '../tokens'
import { Field } from './Field'

// Re-export Field and Sel for backward compatibility
export { Field } from './Field'
export { Sel } from './Sel'

interface InpProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export function Inp({ label, style, hint, required, ...rest }: InpProps) {
  const inputEl = (
    <input
      step={rest.type === 'number' ? 'any' : undefined}
      {...rest}
      style={{
        width: '100%', background: rest.readOnly ? P.bg3 : P.bg2,
        border: `1.5px solid ${P.border}`, borderRadius: 10, padding: '9px 13px',
        color: P.plum, fontSize: 16, outline: 'none',
        fontFamily: 'Cairo, sans-serif', transition: 'border .15s',
        ...style
      }}
      onFocus={(e) => { if (!rest.readOnly) e.target.style.borderColor = P.borderS; rest.onFocus?.(e) }}
      onBlur={(e) => { e.target.style.borderColor = P.border; rest.onBlur?.(e) }}
    />
  )
  return label ? <Field label={label} required={required} hint={hint}>{inputEl}</Field> : inputEl
}
