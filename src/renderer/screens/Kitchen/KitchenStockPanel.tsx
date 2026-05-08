import { useState, useMemo, useEffect, useCallback } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { Inp } from '../../components/Inp'
import { Field } from '../../components/Field'
import { toast } from '../../components/Toast'
import { useKitchenStock } from '../../hooks/useKitchen'
import { ResponsiveTable, Pagination, usePaginated } from '../../components/layouts'

const api = (window as any).api
const UNIT_TYPES = [
  { value: 'weight', label: 'وزن' },
  { value: 'volume', label: 'حجم' },
  { value: 'quantity', label: 'كمية' },
]

export function KitchenStockPanel() {
  const { stock, reload } = useKitchenStock()
  const [showAdj, setShowAdj] = useState<any>(null)
  const [adjType, setAdjType] = useState<'add' | 'remove' | 'correction'>('add')
  const [adjQty, setAdjQty] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [showUsage, setShowUsage] = useState<any>(null)
  const [usageQty, setUsageQty] = useState('')
  const [usageReason, setUsageReason] = useState('')
  const [filter, setFilter] = useState<'all' | 'premade' | 'ingredient' | 'low'>('all')
  const [search, setSearch] = useState('')

  // Create premade
  const [showCreatePremade, setShowCreatePremade] = useState(false)
  const [pmName, setPmName] = useState('')
  const [pmUnit, setPmUnit] = useState('kg')
  const [pmQty, setPmQty] = useState('')

  // Edit/delete premade
  const [showEdit, setShowEdit] = useState<any>(null)
  const [editName, setEditName] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [showDelete, setShowDelete] = useState<any>(null)

  // Units from DB
  const [dbUnits, setDbUnits] = useState<any[]>([])
  const [showNewUnit, setShowNewUnit] = useState(false)
  const [newUnitId, setNewUnitId] = useState('')
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitType, setNewUnitType] = useState('quantity')

  const loadUnits = useCallback(async () => {
    try {
      const u = await api?.inventory?.listUnits?.()
      if (u) setDbUnits(u)
    } catch {}
  }, [])
  useEffect(() => { loadUnits() }, [loadUnits])

  const doCreateUnit = async () => {
    if (!newUnitId.trim() || !newUnitName.trim()) { toast('أدخل رمز واسم الوحدة'); return }
    try {
      await api?.inventory?.createUnit?.(newUnitId.trim(), newUnitName.trim(), newUnitType)
      toast(`✓ تم إنشاء وحدة: ${newUnitName}`)
      setPmUnit(newUnitId.trim())
      setEditUnit(newUnitId.trim())
      setShowNewUnit(false)
      setNewUnitId(''); setNewUnitName(''); setNewUnitType('quantity')
      loadUnits()
    } catch (err: any) { toast(err.message || 'خطأ') }
  }

  const filtered = useMemo(() => {
    let items = stock
    if (filter === 'premade') items = items.filter((s: any) => s.type === 'premade')
    else if (filter === 'ingredient') items = items.filter((s: any) => s.type !== 'premade')
    else if (filter === 'low') items = items.filter((s: any) => {
      const th = s.low_threshold || 0
      return th > 0 && (s.kitchen_stock || 0) <= th
    })
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter((s: any) => s.name?.toLowerCase().includes(q))
    }
    return items
  }, [stock, filter, search])

  const paged = usePaginated(filtered, 12)

  const doAdjust = async () => {
    if (!showAdj || !adjQty) { toast('أدخل الكمية'); return }
    const qty = parseFloat(adjQty)
    if (isNaN(qty) || qty <= 0) { toast('كمية غير صالحة'); return }
    try {
      if (adjType === 'correction') {
        await api?.kitchen?.correctStock?.({ itemId: showAdj.id, newQuantity: qty, reason: adjReason || 'تصحيح مطبخ' })
      } else {
        await api?.kitchen?.adjustStock?.({ itemId: showAdj.id, quantity: qty, type: adjType, reason: adjReason || (adjType === 'add' ? 'إضافة مطبخ' : 'سحب مطبخ') })
      }
      toast(`✓ تم تعديل مخزون: ${showAdj.name}`)
      setShowAdj(null); setAdjQty(''); setAdjReason(''); reload()
    } catch (err: any) { toast(err.message || 'خطأ') }
  }

  const doUsage = async () => {
    if (!showUsage || !usageQty) { toast('أدخل الكمية'); return }
    try {
      await api?.kitchen?.reportUsage?.({ itemId: showUsage.id, quantity: parseFloat(usageQty), reason: usageReason || 'استهلاك مطبخ' })
      toast(`✓ تم تسجيل استهلاك: ${showUsage.name}`)
      setShowUsage(null); setUsageQty(''); setUsageReason(''); reload()
    } catch (err: any) { toast(err.message || 'خطأ') }
  }

  const doCreatePremade = async () => {
    if (!pmName.trim()) { toast('أدخل اسم المادة'); return }
    const qty = parseFloat(pmQty) || 0
    try {
      await api?.kitchen?.createPremade?.({ name: pmName.trim(), unit: pmUnit, quantity: qty })
      toast(`✓ تم إنشاء: ${pmName}`)
      setShowCreatePremade(false)
      reload()
    } catch (err: any) { toast(err.message || 'خطأ') }
  }

  const doEditPremade = async () => {
    if (!showEdit) return
    try {
      await api?.kitchen?.editPremade?.({ id: showEdit.id, name: editName.trim() || undefined, unit: editUnit || undefined })
      toast(`✓ تم تعديل: ${editName || showEdit.name}`)
      setShowEdit(null); reload()
    } catch (err: any) { toast(err.message || 'خطأ') }
  }

  const doDeletePremade = async () => {
    if (!showDelete) return
    try {
      await api?.kitchen?.deletePremade?.(showDelete.id)
      toast(`✓ تم حذف: ${showDelete.name}`)
      setShowDelete(null); reload()
    } catch (err: any) { toast(err.message || 'خطأ') }
  }

  const filterChips = [
    { id: 'all' as const, label: 'الكل', count: stock.length },
    { id: 'ingredient' as const, label: '🧂 خام', count: stock.filter((s: any) => s.type !== 'premade').length },
    { id: 'premade' as const, label: '⚙ جاهز', count: stock.filter((s: any) => s.type === 'premade').length },
    { id: 'low' as const, label: '⚠ منخفض', count: stock.filter((s: any) => { const th = s.low_threshold || 0; return th > 0 && (s.kitchen_stock || 0) <= th }).length },
  ]

  const selS: React.CSSProperties = {
    width: '100%', background: P.bg2, border: `1.5px solid ${P.border}`, borderRadius: 10,
    padding: '9px 13px', color: P.plum, fontSize: 14, outline: 'none',
    fontFamily: 'Cairo, sans-serif', cursor: 'pointer'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* ── Header Bar ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn variant="primary" icon="plus"
          onClick={() => { setShowCreatePremade(true); setPmName(''); setPmUnit('kg'); setPmQty('') }}
          style={{ fontSize: 12, padding: '7px 14px' }}>إضافة مادة جاهزة</Btn>

        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في المخزون..."
            style={{
              width: '100%', padding: '7px 12px 7px 12px', borderRadius: 10,
              border: `1.5px solid ${P.border}`, background: P.surface,
              fontSize: 12, fontFamily: 'Cairo,sans-serif', color: P.ink,
              outline: 'none', direction: 'rtl', paddingRight: 30,
            }}
            onFocus={e => e.currentTarget.style.borderColor = P.purple}
            onBlur={e => e.currentTarget.style.borderColor = P.border}
          />
          <div style={{ position: 'absolute', top: '50%', right: 9, transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Icon name="search" size={13} color={P.faint} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {filterChips.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: filter === f.id ? 700 : 500,
              cursor: 'pointer', border: `1.5px solid ${filter === f.id ? (f.id === 'low' ? P.rose : P.purple) : P.border}`,
              background: filter === f.id ? (f.id === 'low' ? P.roseXL : P.purpleXL) : P.surface,
              color: filter === f.id ? (f.id === 'low' ? P.rose : P.purple) : P.muted,
              fontFamily: 'Cairo,sans-serif', transition: 'all .12s', whiteSpace: 'nowrap',
            }}>
              {f.label} <span style={{ opacity: 0.7 }}>({f.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: P.muted }}>{search ? 'لا توجد نتائج' : 'لا يوجد مخزون في المطبخ'}</div>
          <div style={{ fontSize: 12, color: P.faint, marginTop: 4 }}>اضغط "إضافة مادة جاهزة" لإنشاء مادة</div>
        </Card>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <ResponsiveTable minWidth={600} stickyHeader>
            <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontFamily: 'Cairo,sans-serif' }}>
              <thead>
                <tr style={{ background: P.bg2 }}>
                  {['المادة', 'النوع', 'الكمية', 'الوحدة', 'الحالة', 'إجراءات'].map(h =>
                    <th key={h} style={{ padding: '9px 12px', fontSize: 12, color: P.muted, fontWeight: 700, textAlign: 'right', borderBottom: `2px solid ${P.borderM}` }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paged.pageRows.map((item: any) => {
                  const lowTh = item.low_threshold || 0
                  const qty = item.kitchen_stock || 0
                  const isLow = lowTh > 0 && qty <= lowTh
                  const sc = isLow ? { c: P.rose, bg: P.roseXL, l: '⚠ منخفض' }
                    : qty > 0 ? { c: P.green, bg: P.greenXL, l: '✓ جيد' }
                    : { c: P.faint, bg: P.bg2, l: 'فارغ' }

                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${P.ghost}`, transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = P.bg2}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 700, color: P.plum }}>{item.name}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: item.type === 'premade' ? P.purpleXL : P.bg2,
                          color: item.type === 'premade' ? P.purple : P.muted,
                          padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700
                        }}>{item.type === 'premade' ? '⚙ جاهز' : '🧂 خام'}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 17, fontWeight: 900, color: qty > 0 ? (isLow ? P.rose : P.green) : P.faint }}>{qty}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: P.muted }}>{item.unit}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: sc.bg, color: sc.c, padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{sc.l}</span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button title="إضافة" onClick={() => { setShowAdj(item); setAdjType('add'); setAdjQty(''); setAdjReason('') }}
                            style={{ padding: '5px 8px', background: P.greenXL, border: `1px solid ${P.greenL}`, borderRadius: 7, color: P.green, cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo,sans-serif', fontWeight: 800 }}>+</button>
                          <button title="سحب" onClick={() => { setShowAdj(item); setAdjType('remove'); setAdjQty(''); setAdjReason('') }}
                            style={{ padding: '5px 8px', background: P.roseXL, border: `1px solid ${P.roseL}`, borderRadius: 7, color: P.rose, cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo,sans-serif', fontWeight: 800 }}>−</button>
                          <button title="استهلاك" onClick={() => { setShowUsage(item); setUsageQty(''); setUsageReason('') }}
                            style={{ padding: '5px 8px', background: P.goldXL, border: `1px solid ${P.goldL}`, borderRadius: 7, color: P.gold, cursor: 'pointer', fontSize: 11, fontFamily: 'Cairo,sans-serif', fontWeight: 700 }}>⚡</button>
                          <button title="تصحيح" onClick={() => { setShowAdj(item); setAdjType('correction'); setAdjQty(''); setAdjReason('') }}
                            style={{ padding: '5px 8px', background: P.bg2, border: `1px solid ${P.borderM}`, borderRadius: 7, color: P.muted, cursor: 'pointer', fontSize: 11, fontFamily: 'Cairo,sans-serif', fontWeight: 700 }}>✎</button>
                          {item.type === 'premade' && (
                            <>
                              <button title="تعديل" onClick={() => { setShowEdit(item); setEditName(item.name); setEditUnit(item.unit) }}
                                style={{ padding: '5px 8px', background: `${P.blue}12`, border: `1px solid ${P.blue}30`, borderRadius: 7, color: P.blue, cursor: 'pointer', fontSize: 11, fontFamily: 'Cairo,sans-serif', fontWeight: 700 }}>📝</button>
                              <button title="حذف" onClick={() => setShowDelete(item)}
                                style={{ padding: '5px 8px', background: P.roseXL, border: `1px solid ${P.roseL}`, borderRadius: 7, color: P.rose, cursor: 'pointer', fontSize: 11, fontFamily: 'Cairo,sans-serif', fontWeight: 700 }}>🗑</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      )}
      <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} startIndex={paged.startIndex} endIndex={paged.endIndex} onChange={paged.setPage} />

      {/* ── Adjustment Modal ── */}
      {showAdj && (
        <Modal title={`${adjType === 'add' ? 'إضافة' : adjType === 'remove' ? 'سحب' : 'تصحيح'} · ${showAdj.name}`}
          onClose={() => setShowAdj(null)} width={400} icon="layers">
          <div style={{ background: P.goldXL, border: `1px solid ${P.goldL}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: P.gold, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="box" size={14} color={P.gold} />
            مخزون المطبخ: {showAdj.kitchen_stock} {showAdj.unit}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {([
              { k: 'add' as const, l: 'إضافة', c: P.green, bg: P.greenXL },
              { k: 'remove' as const, l: 'سحب', c: P.rose, bg: P.roseXL },
              { k: 'correction' as const, l: 'تصحيح', c: P.purple, bg: P.purpleXL }
            ]).map(t => (
              <button key={t.k} onClick={() => setAdjType(t.k)} style={{
                flex: 1, padding: '8px', borderRadius: 9,
                border: `1.5px solid ${adjType === t.k ? t.c : P.border}`,
                background: adjType === t.k ? t.bg : 'transparent',
                color: adjType === t.k ? t.c : P.muted, cursor: 'pointer',
                fontSize: 13, fontWeight: adjType === t.k ? 800 : 400, fontFamily: 'Cairo,sans-serif',
              }}>{t.l}</button>
            ))}
          </div>
          <Field label={adjType === 'correction' ? `الكمية الجديدة (${showAdj.unit})` : `الكمية (${showAdj.unit})`} required>
            <Inp value={adjQty} onChange={(e: any) => setAdjQty(e.target.value)} type="number" autoFocus />
          </Field>
          <Field label="السبب">
            <Inp value={adjReason} onChange={(e: any) => setAdjReason(e.target.value)} placeholder="اختياري" />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn variant="secondary" onClick={() => setShowAdj(null)} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="primary" onClick={doAdjust} style={{ flex: 1 }}>تطبيق</Btn>
          </div>
        </Modal>
      )}

      {/* ── Usage Modal ── */}
      {showUsage && (
        <Modal title={`استهلاك · ${showUsage.name}`} onClose={() => setShowUsage(null)} width={400} icon="layers">
          <div style={{ background: P.goldXL, border: `1px solid ${P.goldL}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: P.gold, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="box" size={14} color={P.gold} />
            مخزون المطبخ: {showUsage.kitchen_stock} {showUsage.unit}
          </div>
          <Field label={`الكمية المستهلكة (${showUsage.unit})`} required>
            <Inp value={usageQty} onChange={(e: any) => setUsageQty(e.target.value)} type="number" autoFocus />
          </Field>
          <Field label="السبب">
            <Inp value={usageReason} onChange={(e: any) => setUsageReason(e.target.value)} placeholder="استخدام يومي، إعداد طلبات..." />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn variant="secondary" onClick={() => setShowUsage(null)} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="primary" onClick={doUsage} style={{ flex: 1 }}>تسجيل الاستهلاك</Btn>
          </div>
        </Modal>
      )}

      {/* ── Create Premade Material Modal ── */}
      {showCreatePremade && (
        <Modal title="إضافة مادة جاهزة" onClose={() => { setShowCreatePremade(false); setShowNewUnit(false) }} width={440} icon="plus">
          <div style={{ background: `linear-gradient(135deg, ${P.purpleXL}, ${P.surface})`, border: `1px solid ${P.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: P.purple, marginBottom: 4 }}>⚙ مادة جاهزة جديدة</div>
            <div style={{ fontSize: 11, color: P.muted }}>أنشئ مادة محضّرة في المطبخ (صلصات، عجائن، خلطات...)</div>
          </div>
          <Field label="اسم المادة" required>
            <Inp value={pmName} onChange={(e: any) => setPmName(e.target.value)}
              placeholder="مثال: صلصة طماطم، عجينة بيتزا..." autoFocus />
          </Field>
          <Field label="الوحدة" required>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select value={pmUnit} onChange={(e: any) => setPmUnit(e.target.value)} style={{ ...selS, flex: 1 }}>
                {dbUnits.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}
              </select>
              <button onClick={() => setShowNewUnit(!showNewUnit)} title="إنشاء وحدة جديدة"
                style={{ padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${showNewUnit ? P.purple : P.border}`, background: showNewUnit ? P.purpleXL : P.bg2, color: P.purple, cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Cairo,sans-serif', whiteSpace: 'nowrap' }}>+</button>
            </div>
          </Field>
          {showNewUnit && (
            <div style={{ background: P.bg2, border: `1.5px solid ${P.border}`, borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.purple }}>🆕 وحدة جديدة</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: P.muted, marginBottom: 2 }}>الرمز</div>
                  <Inp value={newUnitId} onChange={(e: any) => setNewUnitId(e.target.value)} placeholder="مثال: tray" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: P.muted, marginBottom: 2 }}>الاسم</div>
                  <Inp value={newUnitName} onChange={(e: any) => setNewUnitName(e.target.value)} placeholder="مثال: صينية" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: P.muted, marginBottom: 2 }}>النوع</div>
                  <select value={newUnitType} onChange={(e: any) => setNewUnitType(e.target.value)} style={{ ...selS, fontSize: 12, padding: '7px 8px' }}>
                    {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <Btn variant="primary" onClick={doCreateUnit} style={{ fontSize: 11, padding: '5px 10px', alignSelf: 'flex-end' }}>إنشاء الوحدة</Btn>
            </div>
          )}
          <Field label={`الكمية الأولية (${dbUnits.find((u: any) => u.id === pmUnit)?.name || pmUnit})`}>
            <Inp value={pmQty} onChange={(e: any) => setPmQty(e.target.value)} type="number" placeholder="0 — اختياري" />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Btn variant="secondary" onClick={() => { setShowCreatePremade(false); setShowNewUnit(false) }} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="primary" icon="plus" onClick={doCreatePremade} style={{ flex: 1 }}>إنشاء وإضافة</Btn>
          </div>
        </Modal>
      )}
      {/* ── Edit Premade Modal ── */}
      {showEdit && (
        <Modal title={`تعديل · ${showEdit.name}`} onClose={() => { setShowEdit(null); setShowNewUnit(false) }} width={420} icon="layers">
          <Field label="اسم المادة" required>
            <Inp value={editName} onChange={(e: any) => setEditName(e.target.value)} autoFocus />
          </Field>
          <Field label="الوحدة" required>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select value={editUnit} onChange={(e: any) => setEditUnit(e.target.value)} style={{ ...selS, flex: 1 }}>
                {dbUnits.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}
              </select>
              <button onClick={() => setShowNewUnit(!showNewUnit)} title="إنشاء وحدة جديدة"
                style={{ padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${showNewUnit ? P.purple : P.border}`, background: showNewUnit ? P.purpleXL : P.bg2, color: P.purple, cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Cairo,sans-serif' }}>+</button>
            </div>
          </Field>
          {showNewUnit && (
            <div style={{ background: P.bg2, border: `1.5px solid ${P.border}`, borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.purple }}>🆕 وحدة جديدة</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: P.muted, marginBottom: 2 }}>الرمز</div>
                  <Inp value={newUnitId} onChange={(e: any) => setNewUnitId(e.target.value)} placeholder="مثال: tray" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: P.muted, marginBottom: 2 }}>الاسم</div>
                  <Inp value={newUnitName} onChange={(e: any) => setNewUnitName(e.target.value)} placeholder="مثال: صينية" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: P.muted, marginBottom: 2 }}>النوع</div>
                  <select value={newUnitType} onChange={(e: any) => setNewUnitType(e.target.value)} style={{ ...selS, fontSize: 12, padding: '7px 8px' }}>
                    {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <Btn variant="primary" onClick={doCreateUnit} style={{ fontSize: 11, padding: '5px 10px', alignSelf: 'flex-end' }}>إنشاء الوحدة</Btn>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn variant="secondary" onClick={() => { setShowEdit(null); setShowNewUnit(false) }} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="primary" onClick={doEditPremade} style={{ flex: 1 }}>حفظ التعديل</Btn>
          </div>
        </Modal>
      )}

      {/* ── Delete Premade Confirm ── */}
      {showDelete && (
        <Modal title="حذف مادة جاهزة" onClose={() => setShowDelete(null)} width={380} icon="alert">
          <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: P.roseXL, border: `2px solid ${P.roseL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>🗑</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: P.plum }}>حذف "{showDelete.name}"؟</div>
            <div style={{ fontSize: 12, color: P.muted, marginTop: 4 }}>سيتم حذف المادة ومخزونها من المطبخ نهائياً</div>
            {(showDelete.kitchen_stock || 0) > 0 && (
              <div style={{ fontSize: 13, color: P.rose, fontWeight: 700, marginTop: 8 }}>⚠ يوجد {showDelete.kitchen_stock} {showDelete.unit} في المخزون</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={() => setShowDelete(null)} style={{ flex: 1 }}>تراجع</Btn>
            <Btn variant="danger" onClick={doDeletePremade} style={{ flex: 1 }}>حذف نهائي</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
