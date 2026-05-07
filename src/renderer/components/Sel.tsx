import React from 'react'
import { P } from '../tokens'
import { Field } from './Field'

interface SelProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[] | string[]
  required?: boolean
  hint?: string
}

export function Sel({ label, options, style, required, hint, ...rest }: SelProps) {
  const selectEl = (
    <select
      {...rest}
      style={{
        width: '100%', background: P.bg2, border: `1.5px solid ${P.border}`, borderRadius: 10,
        padding: '9px 13px', color: P.plum, fontSize: 15, outline: 'none',
        fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', ...style
      }}
    >
      {options.map((o: any) =>
        typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  )
  return label ? <Field label={label} required={required} hint={hint}>{selectEl}</Field> : selectEl
}
