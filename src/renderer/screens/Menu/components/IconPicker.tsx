import React, { useState, useMemo } from 'react'
import { P } from '../../../tokens'
import { Modal } from '../../../components/Modal'
import { Inp } from '../../../components/Inp'
import { MENU_ICONS, ICON_CATS, type MIcon } from '../../../components/menuIcons'
import { MenuIcon } from '../../../components/MenuIcon'

interface IconPickerProps {
  value: string
  onChange: (id: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState('hot')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = MENU_ICONS
    if (search.trim()) {
      list = list.filter(i => i.label.includes(search.trim()) || i.id.includes(search.trim().toLowerCase()))
    } else {
      list = list.filter(i => i.cat === cat)
    }
    return list
  }, [cat, search])

  const select = (icon: MIcon) => {
    onChange(icon.id)
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="momo-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          borderRadius: 12, border: `1.5px solid ${P.borderM}`, background: P.surface,
          cursor: 'pointer', fontFamily: 'Tajawal,sans-serif', fontSize: 14, color: P.plum,
          width: '100%', justifyContent: 'center',
        }}
      >
        <MenuIcon id={value} size={28} />
        <span style={{ fontWeight: 700 }}>{value ? 'تغيير الأيقونة' : 'اختر أيقونة'}</span>
      </button>

      {/* Picker Modal */}
      {open && (
        <Modal title="اختر أيقونة" onClose={() => { setOpen(false); setSearch('') }} width={560} icon="palette">
          {/* Search */}
          <Inp
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            placeholder="🔍 ابحث عن أيقونة..."
            style={{ marginBottom: 12 }}
          />

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {ICON_CATS.map(c => (
              <button
                key={c.id}
                onClick={() => { setCat(c.id); setSearch('') }}
                className="momo-pill"
                style={{
                  padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: cat === c.id && !search ? 800 : 500,
                  border: `1.5px solid ${cat === c.id && !search ? P.purple : P.borderM}`,
                  background: cat === c.id && !search ? P.purple : P.surface,
                  color: cat === c.id && !search ? '#fff' : P.muted,
                  cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Icon grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
            gap: 8, maxHeight: 320, overflowY: 'auto', padding: 4,
          }}>
            {filtered.map(icon => {
              const isSelected = value === icon.id
              return (
                <button
                  key={icon.id}
                  onClick={() => select(icon)}
                  className="momo-btn"
                  title={icon.label}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${isSelected ? P.purple : 'transparent'}`,
                    background: isSelected ? P.purpleXL : P.ghost,
                    boxShadow: isSelected ? `0 0 0 2px ${P.purpleL}` : 'none',
                  }}
                >
                  <MenuIcon id={icon.id} size={32} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: isSelected ? P.purple : P.muted,
                    fontFamily: 'Tajawal,sans-serif', textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}>
                    {icon.label}
                  </span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 32, color: P.faint, fontSize: 14, fontWeight: 700 }}>
                لا توجد نتائج
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
