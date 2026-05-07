import React, { useRef } from 'react'
import { P } from '../../../tokens'
import { Btn } from '../../../components/Btn'

export const ImagePicker = ({ value, onChange, itemName }: any) => {
  const [preview, setPreview] = React.useState(value || '')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { const d = ev.target?.result as string; setPreview(d); onChange(d) }
    reader.readAsDataURL(file)
  }
  const clear = () => { setPreview(''); onChange(null) }

  return (
    <div>
      {preview && (
        <div style={{ position: 'relative', marginBottom: 12, width: 120, height: 120 }}>
          <img src={preview} alt="preview" style={{ width: 120, height: 120, borderRadius: 14, objectFit: 'cover', objectPosition: 'center', border: `1.5px solid ${P.borderM}`, display: 'block' }} />
          <button onClick={clear} style={{ position: 'absolute', top: -8, left: -8, width: 24, height: 24, borderRadius: '50%', background: P.rose, border: '2px solid #fff', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      <Btn variant="secondary" icon="upload" fullWidth onClick={() => fileRef.current?.click()}>{preview ? 'تغيير الصورة' : 'رفع صورة من الجهاز'}</Btn>
    </div>
  )
}
