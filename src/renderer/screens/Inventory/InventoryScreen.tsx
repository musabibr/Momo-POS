import React, { useState, useEffect } from 'react'
import { P } from '../../tokens'
import { ScrollableTabs, Pagination, usePaginated } from '../../components/layouts'
import { Card } from '../../components/Card'
import { Modal } from '../../components/Modal'
import { Icon } from '../../components/Icon'
import { Btn } from '../../components/Btn'
import { Inp, Sel, Field } from '../../components/Inp'
import { toast } from '../../components/Toast'
import { ResponsiveTable } from '../../components/layouts'
import { StockTab } from './StockTab'
import { useInventoryItems, useTransfers } from '../../hooks/useInventory'
const api = (window as any).api

export function InventoryScreen() {
  const [tab, setTab] = useState('stock')
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',padding:'16px 14px',gap:14}}>
      <div style={{fontSize:20,fontWeight:900,color:P.plum}}>المخزون</div>
      <ScrollableTabs tabs={[
        {id:'stock',label:'المخزون'},
        {id:'units',label:'الوحدات والتحويلات'},
        {id:'stats',label:'إحصائيات'},
      ]} active={tab} onChange={setTab}/>
      <div style={{flex:1,overflow:'hidden'}}>
        {tab==='stock'&&<StockTab/>}
        {tab==='units'&&<div style={{height:'100%',overflowY:'auto',display:'flex',flexDirection:'column',gap:14}}><UnitsSection/></div>}
        {tab==='stats'&&<StatsTab/>}
      </div>
    </div>
  )
}

function StatsTab() {
  const {items:ings} = useInventoryItems()
  const {transfers} = useTransfers({limit:100})

  const lowStock = ings.filter(i=>i.low_threshold>0&&(i.stock_main??i.stock??0)+(i.stock_kitchen??0)<=i.low_threshold)
  const noCost = ings.filter(i=>!i.cost_per_unit || i.cost_per_unit<=0)
  const totalValue = ings.reduce((s,i)=>s+((i.stock_main??i.stock??0)*(i.cost_per_unit||0)),0)
  const kitchenValue = ings.reduce((s,i)=>s+((i.stock_kitchen??0)*(i.cost_per_unit||0)),0)
  const totalAllValue = totalValue + kitchenValue

  const valued = ings.map(i => {
    const mainQty = i.stock_main ?? i.stock ?? 0
    const kitQty = i.stock_kitchen ?? 0
    const cost = i.cost_per_unit || 0
    return { ...i, mainQty, kitQty, cost, mainVal: mainQty * cost, kitVal: kitQty * cost, totalVal: (mainQty + kitQty) * cost }
  }).sort((a, b) => b.totalVal - a.totalVal)
  const pagedVal = usePaginated(valued, 10)
  const pagedTransfers = usePaginated(transfers, 8)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14,height:'100%',overflowY:'auto'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:10}}>
        {[
          {l:'إجمالي المكونات',v:ings.length,c:P.purple,icon:'📦'},
          {l:'مخزون منخفض',v:lowStock.length,c:lowStock.length>0?P.rose:P.green,icon:lowStock.length>0?'⚠️':'✅'},
          {l:'قيمة المستودع',v:`${totalValue.toLocaleString()} ج.س`,c:P.plum,icon:'🏭'},
          {l:'قيمة المطبخ',v:`${kitchenValue.toLocaleString()} ج.س`,c:P.gold,icon:'🍳'},
          {l:'إجمالي القيمة',v:`${totalAllValue.toLocaleString()} ج.س`,c:P.purple,icon:'💰'},
          {l:'بدون تكلفة',v:noCost.length,c:noCost.length>0?P.rose:P.green,icon:noCost.length>0?'❌':'✅'},
        ].map(k=>(
          <Card key={k.l} style={{padding:12}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
              <span style={{fontSize:18}}>{k.icon}</span>
              <span style={{fontSize:11,color:P.muted,fontWeight:700}}>{k.l}</span>
            </div>
            <div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
          </Card>
        ))}
      </div>

      {noCost.length>0&&<div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <Icon name="alert" size={16} color={P.gold}/>
        <span style={{fontSize:13,color:P.gold,fontWeight:700}}>{noCost.length} مكوّن بدون تكلفة — لن تظهر قيمتها بشكل دقيق:</span>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {noCost.slice(0,8).map(i=><span key={i.id} style={{fontSize:11,background:P.goldXL,color:P.gold,padding:'2px 8px',borderRadius:99,fontWeight:700}}>{i.name}</span>)}
          {noCost.length>8&&<span style={{fontSize:11,color:P.gold}}>+{noCost.length-8}</span>}
        </div>
      </div>}

      {lowStock.length>0&&<Card style={{padding:16}}>
        <div style={{fontSize:14,fontWeight:800,color:P.rose,marginBottom:10}}>⚠️ مكونات تحت الحد الأدنى</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {lowStock.map(i=>{
            const total=(i.stock_main??i.stock??0)+(i.stock_kitchen??0)
            return <div key={i.id} style={{background:P.roseXL,border:`1px solid ${P.roseL}`,borderRadius:10,padding:'8px 14px',fontSize:13}}>
              <div style={{fontWeight:700,color:P.plum}}>{i.name}</div>
              <div style={{color:P.rose,fontWeight:800,fontSize:15}}>{total} <span style={{fontSize:11,fontWeight:500}}>/ {i.low_threshold} {i.unit}</span></div>
            </div>
          })}
        </div>
      </Card>}

      <Card style={{padding:16}}>
        <div style={{fontSize:14,fontWeight:800,color:P.plum,marginBottom:10}}>💰 تقييم المخزون</div>
        <ResponsiveTable minWidth={600}>
        <table style={{width:'100%',minWidth:600,borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:`2px solid ${P.border}`,background:P.bg2}}>
            {['المنتج','الوحدة','تكلفة/وحدة','مستودع','قيمة المستودع','مطبخ','قيمة المطبخ','الإجمالي'].map(h=>
              <th key={h} style={{padding:'8px 10px',fontSize:11,color:P.muted,fontWeight:700,textAlign:'right'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {pagedVal.pageRows.map(i=>(
              <tr key={i.id} style={{borderBottom:`1px solid ${P.ghost}`}} onMouseEnter={e=>e.currentTarget.style.background=P.bg2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'8px 10px',fontSize:13,fontWeight:700,color:P.plum}}>{i.name}</td>
                <td style={{padding:'8px 10px',fontSize:12,color:P.muted}}>{i.unit}</td>
                <td style={{padding:'8px 10px',fontSize:13,fontWeight:700,color:i.cost>0?P.purple:P.rose}}>{i.cost>0?i.cost:'—'}</td>
                <td style={{padding:'8px 10px',fontSize:13,color:P.ink}}>{i.mainQty}</td>
                <td style={{padding:'8px 10px',fontSize:13,fontWeight:700,color:P.plum}}>{i.mainVal>0?`${i.mainVal.toLocaleString()} ج.س`:'—'}</td>
                <td style={{padding:'8px 10px',fontSize:13,color:P.gold}}>{i.kitQty}</td>
                <td style={{padding:'8px 10px',fontSize:13,fontWeight:700,color:P.gold}}>{i.kitVal>0?`${i.kitVal.toLocaleString()} ج.س`:'—'}</td>
                <td style={{padding:'8px 10px',fontSize:14,fontWeight:900,color:P.purple}}>{i.totalVal>0?`${i.totalVal.toLocaleString()} ج.س`:'—'}</td>
              </tr>
            ))}
            <tr style={{borderTop:`2px solid ${P.border}`,background:P.bg2}}>
              <td colSpan={4} style={{padding:'10px 10px',fontSize:14,fontWeight:900,color:P.plum,textAlign:'right'}}>المجموع</td>
              <td style={{padding:'10px 10px',fontSize:14,fontWeight:900,color:P.plum}}>{totalValue.toLocaleString()} ج.س</td>
              <td style={{padding:'10px 10px'}}></td>
              <td style={{padding:'10px 10px',fontSize:14,fontWeight:900,color:P.gold}}>{kitchenValue.toLocaleString()} ج.س</td>
              <td style={{padding:'10px 10px',fontSize:16,fontWeight:900,color:P.purple}}>{totalAllValue.toLocaleString()} ج.س</td>
            </tr>
          </tbody>
        </table></ResponsiveTable>
        <Pagination page={pagedVal.page} totalPages={pagedVal.totalPages} total={pagedVal.total} startIndex={pagedVal.startIndex} endIndex={pagedVal.endIndex} onChange={pagedVal.setPage}/>
      </Card>

      <Card style={{padding:16}}>
        <div style={{fontSize:14,fontWeight:800,color:P.purple,marginBottom:10}}>🔄 آخر التحويلات</div>
        {transfers.length===0?<div style={{padding:20,textAlign:'center',color:P.faint,fontSize:13}}>لا توجد تحويلات بعد</div>:(
          <ResponsiveTable minWidth={500}>
          <table style={{width:'100%',minWidth:500,borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`1.5px solid ${P.border}`}}>
              {['المنتج','من','إلى','الكمية','التاريخ'].map(h=><th key={h} style={{padding:'8px 10px',fontSize:12,color:P.muted,fontWeight:700,textAlign:'right'}}>{h}</th>)}
            </tr></thead>
            <tbody>{pagedTransfers.pageRows.map((t:any)=>(
              <tr key={t.id} style={{borderBottom:`1px solid ${P.ghost}`}}>
                <td style={{padding:'9px 10px',fontSize:13,fontWeight:700,color:P.plum}}>{t.item_name}</td>
                <td style={{padding:'9px 10px'}}><span style={{background:P.purpleXL,color:P.purple,padding:'1px 6px',borderRadius:99,fontSize:11}}>{t.from_location==='main'?'مستودع':'مطبخ'}</span></td>
                <td style={{padding:'9px 10px'}}><span style={{background:P.goldXL,color:P.gold,padding:'1px 6px',borderRadius:99,fontSize:11}}>{t.to_location==='kitchen'?'مطبخ':'مستودع'}</span></td>
                <td style={{padding:'9px 10px',fontSize:14,fontWeight:800,color:P.plum}}>{t.quantity} {t.unit}</td>
                <td style={{padding:'9px 10px',fontSize:11,color:P.muted,direction:'ltr' as const}}>{t.created_at?.slice(0,16)}</td>
              </tr>
            ))}</tbody>
          </table></ResponsiveTable>
        )}
        {transfers.length>8&&<Pagination page={pagedTransfers.page} totalPages={pagedTransfers.totalPages} total={pagedTransfers.total} startIndex={pagedTransfers.startIndex} endIndex={pagedTransfers.endIndex} onChange={pagedTransfers.setPage}/>}
      </Card>
    </div>
  )
}

function UnitsSection() {
  const [units, setUnits] = useState<any[]>([])
  const [convs, setConvs] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editUnit, setEditUnit] = useState<any>(null)
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [subUnit, setSubUnit] = useState('')
  const [subFactor, setSubFactor] = useState('')
  const [newSubId, setNewSubId] = useState('')
  const [newSubName, setNewSubName] = useState('')

  const pagedUnits = usePaginated(units, 10)

  const loadAll = () => {
    api?.inventory?.listUnits?.().then((r:any) => { if(r) setUnits(r) }).catch(()=>{})
    api?.inventory?.listConversions?.().then((r:any) => { if(r) setConvs(r) }).catch(()=>{})
  }
  useEffect(() => { loadAll() }, [])

  const resetForm = () => { setNewId('');setNewName('');setSubUnit('');setSubFactor('');setNewSubId('');setNewSubName('') }
  const isNewSub = subUnit === '__new__'
  const resolvedSubName = isNewSub ? newSubName : (units.find(u=>u.id===subUnit)?.name || 'وحدة فرعية')
  const hasSubUnit = subUnit && subUnit !== ''

  const addUnit = async () => {
    if(!newId.trim()||!newName.trim()){toast('أدخل الرمز والاسم');return}
    if(hasSubUnit && !subFactor){toast('أدخل معامل التحويل');return}
    if(isNewSub && (!newSubId.trim()||!newSubName.trim())){toast('أدخل بيانات الوحدة الفرعية');return}
    try {
      await api?.inventory?.createUnit?.(newId.trim(),newName.trim(),'quantity')
      if(isNewSub) await api?.inventory?.createUnit?.(newSubId.trim(),newSubName.trim(),'quantity')
      if(hasSubUnit && subFactor) {
        await api?.inventory?.createConversion?.(newId.trim(), isNewSub ? newSubId.trim() : subUnit, parseFloat(subFactor))
      }
      toast('تمت إضافة الوحدة');loadAll();resetForm();setShowAdd(false)
    } catch(err:any){toast(err.message||'خطأ')}
  }

  const openEdit = (u: any) => {
    const uConvs = getConvsFor(u.id)
    // Pre-populate sub-unit from first conversion where this unit is the 'from'
    const fromConv = uConvs.find((c:any) => c.from_unit === u.id)
    setEditUnit({...u, _origId: u.id})
    if(fromConv) { setSubUnit(fromConv.to_unit); setSubFactor(String(fromConv.factor)) }
    else { setSubUnit(''); setSubFactor('') }
    setNewSubId(''); setNewSubName('')
  }

  const saveEdit = async () => {
    if(!editUnit||!editUnit.id.trim()||!editUnit.name.trim()){toast('أدخل الرمز والاسم');return}
    if(hasSubUnit && !subFactor){toast('أدخل معامل التحويل');return}
    if(isNewSub && (!newSubId.trim()||!newSubName.trim())){toast('أدخل بيانات الوحدة الفرعية');return}
    try {
      const newUnitId = editUnit.id.trim()
      // 1. Update the unit (this cascades ID rename in DB)
      await api?.inventory?.updateUnit?.(editUnit._origId, newUnitId, editUnit.name.trim())
      // 2. Delete old from-conversions (use new ID since updateUnit already renamed references)
      const oldConvs = convs.filter(c => c.from_unit === editUnit._origId)
      for(const c of oldConvs) await api?.inventory?.deleteConversion?.(c.id)
      // 3. Create new conversion if sub-unit specified
      if(hasSubUnit && subFactor) {
        if(isNewSub) await api?.inventory?.createUnit?.(newSubId.trim(),newSubName.trim(),'quantity')
        const targetId = isNewSub ? newSubId.trim() : subUnit
        await api?.inventory?.createConversion?.(newUnitId, targetId, parseFloat(subFactor))
      }
      toast('تم تعديل الوحدة');loadAll();setEditUnit(null);setSubUnit('');setSubFactor('');setNewSubId('');setNewSubName('')
    } catch(err:any){toast(err.message||'خطأ')}
  }

  const unitOpts = units.map((u:any)=>({value:u.id,label:u.name}))
  const getConvsFor = (uid: string) => convs.filter(c => c.from_unit === uid || c.to_unit === uid)

  return (<>
    <Card style={{padding:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:900,color:P.plum}}>📐 الوحدات والتحويلات</div>
        <Btn variant="primary" icon="plus" onClick={()=>setShowAdd(true)}>إضافة وحدة</Btn>
      </div>

      <ResponsiveTable minWidth={500}>
      <table style={{width:'100%',minWidth:500,borderCollapse:'collapse'}}>
        <thead><tr style={{borderBottom:`2px solid ${P.border}`,background:P.bg2}}>
          {['الرمز','الاسم','التحويلات',''].map(h=><th key={h} style={{padding:'9px 12px',fontSize:12,color:P.muted,fontWeight:700,textAlign:'right'}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {pagedUnits.pageRows.map((u:any)=>{
            const uConvs = getConvsFor(u.id)
            return (
              <tr key={u.id} style={{borderBottom:`1px solid ${P.ghost}`}} onMouseEnter={e=>e.currentTarget.style.background=P.bg2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'10px 12px',fontSize:13,fontWeight:700,color:P.purple}}>{u.id}</td>
                <td style={{padding:'10px 12px',fontSize:14,fontWeight:800,color:P.plum}}>{u.name}</td>
                <td style={{padding:'10px 12px'}}>
                  {uConvs.length===0?<span style={{fontSize:12,color:P.faint}}>—</span>:
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {uConvs.map((c:any)=>(
                        <span key={c.id} style={{display:'inline-flex',alignItems:'center',gap:4,background:P.bg2,borderRadius:8,padding:'3px 8px',fontSize:11}}>
                          <span style={{fontWeight:700,color:P.purple}}>1 {c.from_name}</span>
                          <span style={{color:P.purple,fontWeight:900}}>=</span>
                          <span style={{fontWeight:900,color:P.plum}}>{c.factor}</span>
                          <span style={{fontWeight:700,color:P.green}}>{c.to_name}</span>
                          <button onClick={async()=>{try{await api?.inventory?.deleteConversion?.(c.id);toast('تم حذف التحويل');loadAll()}catch(e:any){toast(e.message)}}} style={{background:'none',border:'none',cursor:'pointer',padding:0,marginRight:2}}><Icon name="del" size={9} color={P.rose}/></button>
                        </span>
                      ))}
                    </div>
                  }
                </td>
                <td style={{padding:'10px 12px'}}>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>openEdit(u)} style={{padding:'4px 8px',background:P.ghost,border:`1px solid ${P.borderM}`,borderRadius:7,cursor:'pointer',display:'flex',alignItems:'center'}}><Icon name="edit" size={13} color={P.purple}/></button>
                    <button onClick={async()=>{try{await api?.inventory?.deleteUnit?.(u.id);toast('تم حذف الوحدة');loadAll()}catch(e:any){toast(e.message)}}} style={{padding:'4px 8px',background:P.ghost,border:`1px solid ${P.borderM}`,borderRadius:7,cursor:'pointer',display:'flex',alignItems:'center'}}><Icon name="del" size={13} color={P.rose}/></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table></ResponsiveTable>
      {units.length===0&&<div style={{padding:24,textAlign:'center',color:P.faint,fontSize:13}}>لا توجد وحدات بعد</div>}
      <Pagination page={pagedUnits.page} totalPages={pagedUnits.totalPages} total={pagedUnits.total} startIndex={pagedUnits.startIndex} endIndex={pagedUnits.endIndex} onChange={pagedUnits.setPage}/>
    </Card>

    {/* Add Unit Modal */}
    {showAdd&&<Modal title="إضافة وحدة" onClose={()=>{setShowAdd(false);resetForm()}} width={420} icon="plus">
      <Field label="الرمز" required><Inp value={newId} onChange={(e:any)=>setNewId(e.target.value)} placeholder="مثال: carton" autoFocus/></Field>
      <Field label="الاسم" required><Inp value={newName} onChange={(e:any)=>setNewName(e.target.value)} placeholder="مثال: كرتون"/></Field>
      <Field label="الوحدة الفرعية"><Sel value={subUnit} onChange={(e:any)=>{setSubUnit(e.target.value);if(!e.target.value){setSubFactor('');setNewSubId('');setNewSubName('')}}} options={[{value:'',label:'بدون (اختياري)'},...unitOpts,{value:'__new__',label:'+ وحدة جديدة…'}]}/></Field>
      {isNewSub&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <Field label="رمز الوحدة الفرعية" required><Inp value={newSubId} onChange={(e:any)=>setNewSubId(e.target.value)} placeholder="مثال: pcs"/></Field>
        <Field label="اسم الوحدة الفرعية" required><Inp value={newSubName} onChange={(e:any)=>setNewSubName(e.target.value)} placeholder="مثال: قطعة"/></Field>
      </div>}
      {hasSubUnit&&<Field label={`1 ${newName||'وحدة'} = كم ${resolvedSubName}؟`} required>
        <Inp value={subFactor} onChange={(e:any)=>setSubFactor(e.target.value)} type="number" placeholder="معامل التحويل"/>
      </Field>}
      <div style={{display:'flex',gap:10,marginTop:8}}>
        <Btn variant="secondary" onClick={()=>{setShowAdd(false);resetForm()}} style={{flex:1}}>إلغاء</Btn>
        <Btn variant="primary" onClick={addUnit} style={{flex:1}}>حفظ</Btn>
      </div>
    </Modal>}

    {/* Edit Unit Modal */}
    {editUnit&&<Modal title={`تعديل وحدة · ${editUnit._origId}`} onClose={()=>{setEditUnit(null);setSubUnit('');setSubFactor('');setNewSubId('');setNewSubName('')}} width={420} icon="edit">
      <Field label="الرمز" required><Inp value={editUnit.id} onChange={(e:any)=>setEditUnit({...editUnit,id:e.target.value})} autoFocus/></Field>
      <Field label="الاسم" required><Inp value={editUnit.name} onChange={(e:any)=>setEditUnit({...editUnit,name:e.target.value})}/></Field>
      <Field label="الوحدة الفرعية"><Sel value={subUnit} onChange={(e:any)=>{setSubUnit(e.target.value);if(!e.target.value){setSubFactor('');setNewSubId('');setNewSubName('')}}} options={[{value:'',label:'بدون (اختياري)'},...unitOpts.filter(o=>o.value!==editUnit._origId),{value:'__new__',label:'+ وحدة جديدة…'}]}/></Field>
      {isNewSub&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <Field label="رمز الوحدة الفرعية" required><Inp value={newSubId} onChange={(e:any)=>setNewSubId(e.target.value)} placeholder="مثال: pcs"/></Field>
        <Field label="اسم الوحدة الفرعية" required><Inp value={newSubName} onChange={(e:any)=>setNewSubName(e.target.value)} placeholder="مثال: قطعة"/></Field>
      </div>}
      {hasSubUnit&&<Field label={`1 ${editUnit.name||'وحدة'} = كم ${resolvedSubName}؟`} required>
        <Inp value={subFactor} onChange={(e:any)=>setSubFactor(e.target.value)} type="number" placeholder="معامل التحويل"/>
      </Field>}
      <div style={{display:'flex',gap:10,marginTop:8}}>
        <Btn variant="secondary" onClick={()=>{setEditUnit(null);setSubUnit('');setSubFactor('')}} style={{flex:1}}>إلغاء</Btn>
        <Btn variant="primary" onClick={saveEdit} style={{flex:1}}>حفظ</Btn>
      </div>
    </Modal>}
  </>)
}
