import React, { useState, useRef } from 'react'
import { P } from '../tokens'
import { Inp } from './Inp'
import { Btn } from './Btn'
import { Icon } from './Icon'

interface ImagePickerProps {
  value: string | null
  onChange: (value: string | null) => void
  itemName?: string
}

export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const [mode, setMode] = useState<'url' | 'upload'>('url')
  const [url, setUrl] = useState(value || '')
  const [preview, setPreview] = useState(value || '')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUrl = (v: string) => { setUrl(v); setPreview(v); onChange(v || null) }
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { const d = ev.target?.result as string; setPreview(d); setUrl(d); onChange(d) }
    reader.readAsDataURL(file)
  }
  const clear = () => { setUrl(''); setPreview(''); onChange(null) }

  return (
    <div>
      {preview && (
        <div style={{ position: 'relative', marginBottom: 12, width: 120, height: 90 }}>
          <img src={preview} alt="preview" style={{ width: 120, height: 90, borderRadius: 12, objectFit: 'cover', border: `1.5px solid ${P.borderM}` }} />
          <button onClick={clear} style={{ position: 'absolute', top: -8, left: -8, width: 24, height: 24, borderRadius: '50%', background: P.rose, border: '2px solid #fff', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['url', 'upload'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1.5px solid ${mode === m ? P.purple : P.borderM}`, background: mode === m ? P.ghost : 'transparent', color: mode === m ? P.purple : P.muted, cursor: 'pointer', fontSize: 12.5, fontWeight: mode === m ? 700 : 400, fontFamily: 'Cairo, sans-serif' }}>
            {m === 'url' ? 'رابط URL' : 'رفع صورة'}
          </button>
        ))}
      </div>
      {mode === 'url' ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <Inp value={url} onChange={(e: any) => handleUrl(typeof e === 'string' ? e : e.target.value)} placeholder="https://..." style={{ flex: 1 }} />
          {url && <Btn variant="secondary" size="sm" onClick={() => setPreview(url)}>معاينة</Btn>}
        </div>
      ) : (
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          <Btn variant="secondary" icon="upload" fullWidth onClick={() => fileRef.current?.click()}>اختر صورة من الجهاز</Btn>
        </div>
      )}
    </div>
  )
}
