import React from 'react'
import { P } from '../../../tokens'
import { Inp, Sel } from '../../../components/Inp'
import { Icon } from '../../../components/Icon'

export const OptionGroupsEditor = ({ groups, onChange }: { groups: any[], onChange: (g: any[]) => void }) => {
  const addGroup = () => onChange([...groups, { name: '', type: 'single', kind: 'variation', options: [] }])
  const updGroup = (i: number, patch: any) => onChange(groups.map((g, gi) => gi === i ? { ...g, ...patch } : g))
  const delGroup = (i: number) => onChange(groups.filter((_, gi) => gi !== i))
  const addOpt = (gi: number) => updGroup(gi, { options: [...groups[gi].options, { name: '', priceAdj: 0 }] })
  const updOpt = (gi: number, oi: number, patch: any) => updGroup(gi, { options: groups[gi].options.map((o: any, j: number) => j === oi ? { ...o, ...patch } : o) })
  const delOpt = (gi: number, oi: number) => updGroup(gi, { options: groups[gi].options.filter((_: any, j: number) => j !== oi) })
  return (
    <div>
      {groups.map((g, gi) => (
        <div key={gi} style={{ border: `1.5px solid ${g.kind === 'modifier' ? P.greenL : P.purpleXL}`, borderRadius: 14, padding: 14, marginBottom: 12, background: g.kind === 'modifier' ? `${P.green}06` : `${P.purple}06` }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <Inp value={g.name} onChange={(e: any) => updGroup(gi, { name: e.target.value })} placeholder="اسم المجموعة" style={{ flex: 1 }} />
            <Sel value={g.type} onChange={(e: any) => updGroup(gi, { type: e.target.value })} options={[{ value: 'single', label: 'اختيار واحد' }, { value: 'multi', label: 'متعدد' }]} />
            <Sel value={g.kind} onChange={(e: any) => updGroup(gi, { kind: e.target.value })} options={[{ value: 'variation', label: 'خيار' }, { value: 'modifier', label: 'إضافة' }]} />
            <button onClick={() => delGroup(gi)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Icon name="del" size={16} color={P.rose} /></button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {g.options.map((opt: any, oi: number) => (
              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 4, background: P.bg2, border: `1px solid ${P.border}`, borderRadius: 10, padding: '4px 8px' }}>
                <Inp value={opt.name} onChange={(e: any) => updOpt(gi, oi, { name: e.target.value })} placeholder="الاسم" style={{ width: 90, padding: '4px 8px', fontSize: 12 }} />
                <Inp value={String(opt.priceAdj || 0)} onChange={(e: any) => updOpt(gi, oi, { priceAdj: parseInt(e.target.value) || 0 })} type="number" placeholder="0" style={{ width: 55, padding: '4px 6px', fontSize: 12 }} />
                <button onClick={() => delOpt(gi, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><Icon name="close" size={12} color={P.faint} /></button>
              </div>
            ))}
            <button onClick={() => addOpt(gi)} style={{ border: `1.5px dashed ${P.borderM}`, borderRadius: 10, padding: '4px 12px', fontSize: 12, color: P.faint, cursor: 'pointer', background: 'none', fontFamily: 'Tajawal,sans-serif' }}>+ خيار</button>
          </div>
        </div>
      ))}
      <button onClick={addGroup} style={{ width: '100%', border: `2px dashed ${P.borderM}`, borderRadius: 12, padding: '10px', fontSize: 13, color: P.muted, cursor: 'pointer', background: 'none', fontFamily: 'Tajawal,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Icon name="plus" size={14} color={P.muted} />إضافة مجموعة خيارات
      </button>
    </div>
  )
}
