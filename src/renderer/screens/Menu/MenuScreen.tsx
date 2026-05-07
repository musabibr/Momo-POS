import React, { useState, useEffect, useMemo } from 'react'
import { P } from '../../tokens'
import { Icon } from '../../components/Icon'
import { MenuIcon } from '../../components/MenuIcon'
import { Btn } from '../../components/Btn'
import { Inp, Sel, Field } from '../../components/Inp'
import { Modal } from '../../components/Modal'
import { Badge } from '../../components/TabBar'
import { Toggle } from '../../components/Toggle'
import { Card } from '../../components/Card'
import { toast } from '../../components/Toast'
import { ScrollableTabs, Pagination, usePaginated } from '../../components/layouts'
import { ItemForm } from './components/ItemForm'
import { GalleryTab } from './components/GalleryTab'

const api = (window as any).api

export function MenuScreen() {
  const [tab, setTab] = useState('items')
  const [items, setItems] = useState<any[]>([])
  const [cats, setCats] = useState<any[]>([])

  const load = () => {
    api?.menu?.listItems?.().then((d: any) => d && setItems(d))
    api?.menu?.listCategories?.().then((d: any) => d && setCats(d))
  }
  useEffect(load, [])

  const rootCats = cats.filter(c => !c.parent_id)
  const subCats = cats.filter(c => c.parent_id)

  // ── Items State ──────────────────
  const [editItem, setEditItem] = useState<any>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState<any>({ name: '', price: '', catId: '', emoji: '🍮', desc: '', image: null, optionGroups: [], subcatId: null, cost: '', barcode: '', displayMode: 'icon' })
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')

  /** Normalize option groups for Zod schema. Give empty names a default instead of filtering. */
  const sanitizeOptionGroups = (groups: any[]) => (groups || [])
    .map((g: any) => ({
      name: (g.name?.trim() || 'خيارات'),
      type: g.type || 'single',
      kind: g.kind || 'variation',
      sortOrder: typeof g.sortOrder === 'number' ? g.sortOrder : undefined,
      options: (g.options || [])
        .filter((o: any) => o.name?.trim())
        .map((o: any) => ({
          name: o.name.trim(),
          priceAdj: typeof o.priceAdj === 'number' && !isNaN(o.priceAdj) ? o.priceAdj : 0,
          isDefault: !!o.isDefault,
          sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : undefined,
        }))
    }))
    .filter((g: any) => g.options.length > 0)  // only keep groups that have at least one option

  const saveItem = async (formData?: any) => {
    const src = formData || newItem
    if (!src.name || !src.price) { toast('يرجى ملء الاسم والسعر'); return }
    try {
      const data = {
        name: src.name, price: parseInt(src.price) || 0, cost: parseInt(src.cost) || null,
        description: src.desc || src.description || null, catId: src.catId || src.cat_id || null,
        subcatId: src.subcatId || src.subcat_id || null,
        emoji: src.emoji, optionGroups: sanitizeOptionGroups(src.optionGroups),
        displayMode: src.displayMode || src.display_mode || 'icon'
      }
      console.log('[Menu] Creating item, optionGroups count:', data.optionGroups.length)
      const created = await api?.menu?.createItem?.(data)
      if (created?.id && src.image && String(src.image).startsWith('data:image')) {
        try { await api?.menu?.saveImage?.(created.id, src.image) } catch {}
      }
      setShowAdd(false)
      setNewItem({ name: '', price: '', catId: '', emoji: '🍮', desc: '', image: null, optionGroups: [], subcatId: null, cost: '', displayMode: 'icon' })
      toast('تم إضافة الصنف ✓'); load()
    } catch (err: any) {
      console.error('[Menu] Create failed:', err)
      toast('خطأ في الحفظ: ' + (err?.message || 'خطأ غير معروف'))
    }
  }

  const updateItem = async (formData?: any) => {
    const src = formData || editItem
    try {
      const groups = sanitizeOptionGroups(src.optionGroups)
      const data = {
        name: src.name, price: parseInt(src.price) || 0, cost: parseInt(src.cost) || null,
        description: src.desc || src.description || null, catId: src.catId || src.cat_id || null,
        subcatId: src.subcatId || src.subcat_id || null,
        emoji: src.emoji, optionGroups: groups,
        displayMode: src.displayMode || src.display_mode || 'icon'
      }
      console.log('[Menu] Updating item, optionGroups count:', groups.length)
      const itemId = src.id || editItem?.id
      await api?.menu?.updateItem?.(itemId, data)
      if (src.image && String(src.image).startsWith('data:image')) {
        try { await api?.menu?.saveImage?.(itemId, src.image) } catch {}
      }
      setEditItem(null); toast('تم حفظ التعديلات ✓'); load()
    } catch (err: any) {
      console.error('[Menu] Update failed:', err)
      toast('خطأ في التحديث: ' + (err?.message || 'خطأ غير معروف'))
    }
  }

  // ── Delete confirmation ──────────────────
  const [confirmDel, setConfirmDel] = useState<{type:'item'|'cat', id:any, name:string}|null>(null)
  const deleteItem = (id: number, name: string) => { setConfirmDel({ type: 'item', id, name }) }
  const confirmDelete = async () => {
    if (!confirmDel) return
    if (confirmDel.type === 'item') { await api?.menu?.deleteItem?.(confirmDel.id); toast('تم حذف الصنف') }
    else { await api?.menu?.deleteCategory?.(confirmDel.id); toast('تم حذف الفئة') }
    setConfirmDel(null); load()
  }

  // ── Categories State ──────────────────
  const [showEditCat, setShowEditCat] = useState<any>(null)
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', color: '#a855f7', parentId: null as string | null })

  const saveCat = async () => {
    if (!newCat.name) { toast('أدخل اسم الفئة'); return }
    await api?.menu?.createCategory?.({ id: crypto.randomUUID(), name: newCat.name, color: newCat.color, parentId: newCat.parentId })
    setShowAddCat(false); setNewCat({ name: '', color: '#a855f7', parentId: null }); toast('تم إضافة الفئة ✓'); load()
  }
  const updateCat = async () => {
    await api?.menu?.updateCategory?.(showEditCat.id, { name: showEditCat.name, color: showEditCat.color, parentId: showEditCat.parent_id })
    setShowEditCat(null); toast('تم حفظ الفئة ✓'); load()
  }
  const deleteCat = (id: string, name: string) => { setConfirmDel({ type: 'cat', id, name }) }

  // ── Filtering + Pagination ──────────────────
  const displayItems = useMemo(() => {
    let list = items
    if (filterCat !== 'all') list = list.filter(i => i.cat_id === filterCat)
    if (search.trim()) list = list.filter(i => i.name.includes(search.trim()))
    return list
  }, [items, filterCat, search])

  const itemsPaged = usePaginated(displayItems, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: P.plum }}>إدارة القائمة</div>
          <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>{items.length} صنف · {rootCats.length} فئة</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'items' && <Btn variant="primary" icon="plus" onClick={() => setShowAdd(true)}>إضافة صنف</Btn>}
          {tab === 'cats' && <Btn variant="primary" icon="plus" onClick={() => setShowAddCat(true)}>إضافة فئة</Btn>}
          {tab === 'gallery' && <div style={{ fontSize: 12, color: P.muted, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="info" size={14} color={P.muted} />اختر منتجاً من القائمة لإدارة صوره</div>}
        </div>
      </div>

      <ScrollableTabs tabs={[
        { id: 'items', label: 'الأصناف' },
        { id: 'cats', label: 'الفئات' },
        { id: 'gallery', label: '🖼️ معرض الصور' },
      ]} active={tab} onChange={setTab} />

      {/* ── Items Tab ────────── */}
      {tab === 'items' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          {/* KPI Strip */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'إجمالي الأصناف', value: items.length, icon: '📦', color: P.purple },
              { label: 'متاح', value: items.filter(i => i.available !== false).length, icon: '✅', color: P.green },
              { label: 'مخفي', value: items.filter(i => i.available === false).length, icon: '🚫', color: P.rose },
              { label: 'متوسط السعر', value: items.length ? Math.round(items.reduce((s, i) => s + i.price, 0) / items.length).toLocaleString() : 0, icon: '💰', color: P.gold },
            ].map((kpi, i) => (
              <div key={i} style={{ flex: '1 1 130px', minWidth: 130, padding: '10px 14px', borderRadius: 14, background: `linear-gradient(135deg, ${kpi.color}08, ${kpi.color}15)`, border: `1px solid ${kpi.color}20`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{kpi.icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: P.muted, fontWeight: 600 }}>{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Search + Category Filter */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Inp value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="ابحث بالاسم…" style={{ paddingRight: 38 }} />
              <Icon name="search" size={15} color={P.faint} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' } as any} />
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[{ id: 'all', name: 'الكل', color: P.purple, count: items.length }, ...rootCats.map(c => ({ ...c, count: items.filter(i => i.cat_id === c.id).length }))].map(c => {
                const active = filterCat === c.id
                return (
                  <button key={c.id} onClick={() => setFilterCat(c.id)} className="momo-pill" style={{
                    padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: active ? 800 : 500, cursor: 'pointer',
                    border: `1.5px solid ${active ? c.color : P.borderM}`,
                    background: active ? `linear-gradient(135deg, ${c.color}, ${c.color}cc)` : P.surface,
                    color: active ? '#fff' : P.muted, fontFamily: 'Tajawal,sans-serif',
                    boxShadow: active ? `0 2px 10px ${c.color}30` : 'none'
                  }}>
                    {c.name} <span style={{ opacity: 0.7, fontSize: 10 }}>({c.count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Card Grid */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px 10px' }}>
            {displayItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: 80, color: P.faint }}>
                <div style={{ fontSize: 56, marginBottom: 12, filter: 'grayscale(0.5)' }}>🍽️</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: P.muted }}>{search ? 'لا توجد نتائج للبحث' : 'القائمة فارغة'}</div>
                <div style={{ fontSize: 13, color: P.faint, marginTop: 6 }}>{search ? 'جرّب كلمة بحث أخرى' : 'أضف أول صنف لبدء القائمة'}</div>
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: P.bg2, borderBottom: `2px solid ${P.borderM}` }}>
                  <th style={{ padding: '12px 14px', color: P.muted, fontSize: 13, fontWeight: 700, width: 60 }}>الشكل</th>
                  <th style={{ padding: '12px 14px', color: P.muted, fontSize: 13, fontWeight: 700 }}>الصنف</th>
                  <th style={{ padding: '12px 14px', color: P.muted, fontSize: 13, fontWeight: 700, width: 120 }}>الفئة</th>
                  <th style={{ padding: '12px 14px', color: P.muted, fontSize: 13, fontWeight: 700, width: 100 }}>السعر</th>
                  <th style={{ padding: '12px 14px', color: P.muted, fontSize: 13, fontWeight: 700, width: 100 }}>التكلفة</th>
                  <th style={{ padding: '12px 14px', color: P.muted, fontSize: 13, fontWeight: 700, width: 80, textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '12px 14px', color: P.muted, fontSize: 13, fontWeight: 700, width: 80, textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {itemsPaged.pageRows.map(item => {
                  const cat = cats.find(c => c.id === item.cat_id)
                  const optCount = (item.optionGroups || []).length
                  const isOff = item.available === false
                  const catColor = cat?.color || P.purple

                  return (
                    <tr key={item.id} style={{
                      borderBottom: `1px solid ${P.border}`,
                      background: P.surface,
                      transition: 'background 0.2s',
                      opacity: isOff ? 0.6 : 1
                    }}>
                      {/* Icon / Image */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, overflow: 'hidden',
                          background: `linear-gradient(160deg, ${catColor}12 0%, ${catColor}06 50%, ${P.bg3} 100%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative'
                        }}>
                          {item.display_mode === 'image' && item.image_path
                            ? <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none' }} />
                            : <span style={{ filter: isOff ? 'grayscale(1)' : 'none' }}><MenuIcon id={item.emoji} size={28} /></span>}
                        </div>
                      </td>

                      {/* Name & Desc */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: P.plum, marginBottom: 2 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: P.faint, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
                            {item.description || 'بدون وصف'}
                          </span>
                          {optCount > 0 && (
                            <span style={{ background: P.purpleXL, color: P.purple, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                              {optCount} خيارات
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '10px 14px' }}>
                        {cat && (
                          <span style={{
                            padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                            background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}20`
                          }}>{cat.name}</span>
                        )}
                      </td>

                      {/* Price */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: P.purple }}>{item.price.toLocaleString()}</span>
                        <span style={{ fontSize: 10, color: P.muted, marginRight: 3 }}>ج.س</span>
                      </td>

                      {/* Cost / Margin */}
                      <td style={{ padding: '10px 14px' }}>
                        {item.cost > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>{item.cost.toLocaleString()}</span>
                              <span style={{ fontSize: 10, color: P.muted, marginRight: 2 }}>ج.س</span>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: ((item.price - item.cost) / item.price * 100) > 50 ? P.green : P.rose }}>
                              هامش: {Math.round((item.price - item.cost) / item.price * 100)}%
                            </span>
                          </div>
                        ) : <span style={{ color: P.faint, fontSize: 12 }}>—</span>}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <Toggle value={item.available !== false} onChange={async v => { await api?.menu?.setAvailable?.(item.id, v); load(); toast(v ? `"${item.name}" متاح` : `"${item.name}" مخفي`) }} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button onClick={() => setEditItem({ ...item, price: String(item.price), cost: String(item.cost ?? ''), desc: item.description || '', catId: item.cat_id, subcatId: item.subcat_id, displayMode: item.display_mode || 'icon' })}
                            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${P.borderM}`, background: P.bg2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = P.purpleXL; e.currentTarget.style.borderColor = P.purple }}
                            onMouseLeave={e => { e.currentTarget.style.background = P.bg2; e.currentTarget.style.borderColor = P.borderM }}>
                            <Icon name="edit" size={14} color={P.purple} />
                          </button>
                          <button onClick={() => deleteItem(item.id, item.name)}
                            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${P.borderM}`, background: P.bg2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = P.roseXL; e.currentTarget.style.borderColor = P.rose }}
                            onMouseLeave={e => { e.currentTarget.style.background = P.bg2; e.currentTarget.style.borderColor = P.borderM }}>
                            <Icon name="del" size={14} color={P.rose} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={itemsPaged.page} totalPages={itemsPaged.totalPages} total={itemsPaged.total} startIndex={itemsPaged.startIndex} endIndex={itemsPaged.endIndex} onChange={itemsPaged.setPage} />
        </div>
      )}

      {/* ── Categories Tab ────────── */}
      {tab === 'cats' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: P.ink, marginBottom: 10 }}>الفئات الرئيسية</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
              {rootCats.map(c => (
                <Card key={c.id} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 15, color: P.plum }}>{c.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Btn variant="ghost" size="sm" icon="edit" onClick={() => setShowEditCat({ ...c })}></Btn>
                      <Btn variant="ghost" size="sm" icon="del" onClick={() => deleteCat(c.id, c.name)} style={{ color: P.rose }}></Btn>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: P.muted }}>{items.filter(i => i.cat_id === c.id).length} صنف</div>
                  <div style={{ fontSize: 11, color: P.faint, marginTop: 4 }}>{cats.filter(sc => sc.parent_id === c.id).length} فئة فرعية</div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: P.ink, marginBottom: 10 }}>الفئات الفرعية</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
              {subCats.map(c => {
                const parent = cats.find(x => x.id === c.parent_id)
                return (
                  <Card key={c.id} style={{ padding: 16, border: `1px solid ${c.color}25` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.color }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: P.plum }}>{c.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Btn variant="ghost" size="sm" icon="edit" onClick={() => setShowEditCat({ ...c })}></Btn>
                        <Btn variant="ghost" size="sm" icon="del" onClick={() => deleteCat(c.id, c.name)} style={{ color: P.rose }}></Btn>
                      </div>
                    </div>
                    {parent && <span style={{ fontSize: 10.5, background: `${parent.color}15`, color: parent.color, padding: '1px 7px', borderRadius: 99 }}>ضمن: {parent.name}</span>}
                  </Card>
                )
              })}
              <div onClick={() => { setNewCat({ name: '', color: '#a855f7', parentId: rootCats[0]?.id || null }); setShowAddCat(true); }} style={{ border: `2px dashed ${P.borderM}`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: P.muted, fontSize: 13, gap: 7 }}>
                <Icon name="plus" size={15} color={P.muted} />إضافة فئة فرعية
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Gallery Tab ────────── */}
      {tab === 'gallery' && (
        <GalleryTab items={items} onReload={load} />
      )}

      {/* ── Modals ────────── */}
      {showAdd && <ItemForm data={newItem} setData={setNewItem} onSave={saveItem} onClose={() => setShowAdd(false)} title="إضافة صنف جديد" rootCats={rootCats} subCats={subCats} />}
      {editItem && <ItemForm data={editItem} setData={setEditItem} onSave={updateItem} onClose={() => setEditItem(null)} title="تعديل الصنف" rootCats={rootCats} subCats={subCats} />}

      {showAddCat && <Modal title="إضافة فئة" onClose={() => setShowAddCat(false)} width={380} icon="layers">
        <Field label="الاسم" required><Inp value={newCat.name} onChange={(e: any) => setNewCat({ ...newCat, name: e.target.value })} autoFocus /></Field>
        <Field label="اللون">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={newCat.color} onChange={e => setNewCat({ ...newCat, color: e.target.value })} style={{ width: 48, height: 38, borderRadius: 9, border: `1.5px solid ${P.border}`, cursor: 'pointer', padding: 2 }} />
            <span style={{ fontSize: 12.5, color: P.muted }}>{newCat.color}</span>
          </div>
        </Field>
        <Field label="فئة رئيسية (اتركه فارغاً للجذر)">
          <Sel value={newCat.parentId || ''} onChange={(e: any) => setNewCat({ ...newCat, parentId: e.target.value || null })} options={[{ value: '', label: '— فئة رئيسية —' }, ...rootCats.map(c => ({ value: c.id, label: c.name }))]} />
        </Field>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}><Btn variant="secondary" onClick={() => setShowAddCat(false)} style={{ flex: 1 }}>إلغاء</Btn><Btn variant="primary" onClick={saveCat} style={{ flex: 1 }}>إضافة</Btn></div>
      </Modal>}

      {showEditCat && <Modal title="تعديل الفئة" onClose={() => setShowEditCat(null)} width={380} icon="edit">
        <Field label="الاسم"><Inp value={showEditCat.name} onChange={(e: any) => setShowEditCat({ ...showEditCat, name: e.target.value })} /></Field>
        <Field label="اللون">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={showEditCat.color} onChange={e => setShowEditCat({ ...showEditCat, color: e.target.value })} style={{ width: 48, height: 38, borderRadius: 9, border: `1.5px solid ${P.border}`, cursor: 'pointer', padding: 2 }} />
          </div>
        </Field>
        <Field label="الفئة الرئيسية">
          <Sel value={showEditCat.parent_id || ''} onChange={(e: any) => setShowEditCat({ ...showEditCat, parent_id: e.target.value || null })}
            options={[{ value: '', label: '— فئة رئيسية —' }, ...rootCats.filter(c => c.id !== showEditCat.id).map(c => ({ value: c.id, label: c.name }))]} />
        </Field>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}><Btn variant="secondary" onClick={() => setShowEditCat(null)} style={{ flex: 1 }}>إلغاء</Btn><Btn variant="success" icon="save" onClick={updateCat} style={{ flex: 1 }}>حفظ</Btn></div>
      </Modal>}

      {/* Delete confirmation */}
      {confirmDel && <Modal title="تأكيد الحذف" onClose={() => setConfirmDel(null)} width={380} icon="alert">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: P.roseXL, border: `2px solid ${P.roseL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Icon name="alert" size={26} color={P.rose} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: P.plum }}>هل تريد حذف "{confirmDel.name}"؟</div>
          <div style={{ fontSize: 14, color: P.muted, marginTop: 6 }}>{confirmDel.type === 'item' ? 'إذا كان مرتبطاً بطلبات سابقة سيتم إخفاؤه فقط' : 'سيتم نقل الأصناف المرتبطة إلى بدون فئة'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setConfirmDel(null)}>إلغاء</Btn>
          <Btn variant="danger" style={{ flex: 1 }} onClick={confirmDelete}>حذف</Btn>
        </div>
      </Modal>}
    </div>
  )
}
