import React, { useState, useMemo, useRef } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Sel, Field } from '../../components/Inp'
import { Modal } from '../../components/Modal'
import { Icon } from '../../components/Icon'
import { toast } from '../../components/Toast'
import { ResponsiveTable, Pagination, usePaginated } from '../../components/layouts'
import { useInventoryItems } from '../../hooks/useInventory'

const api = (window as any).api
const DEFAULT_UNITS = [
  {value:'g',label:'جرام'},{value:'kg',label:'كيلو'},{value:'ml',label:'مل'},{value:'l',label:'لتر'},
  {value:'pcs',label:'قطعة'},{value:'box',label:'صندوق'},{value:'pack',label:'عبوة'},{value:'bottle',label:'زجاجة'}
]

export function StockTab() {
  const { items: ings, reload: load } = useInventoryItems()
  const [dbUnits, setDbUnits] = useState<{value:string,label:string}[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all'|'low'|'good'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<any>(null)
  const [showAdj, setShowAdj] = useState<any>(null)
  const [showTransfer, setShowTransfer] = useState<any>(null)
  const [transferDir, setTransferDir] = useState<'toKitchen'|'toMain'>('toKitchen')
  const [confirmDel, setConfirmDel] = useState<{id:number,name:string}|null>(null)
  const [form, setForm] = useState({name:'',unit:'g',stock:'0',lowThreshold:'0',costPerUnit:'',barcode:'',type:'ingredient'})
  const [adjType, setAdjType] = useState('add')
  const [adjQty, setAdjQty] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [adjLocation, setAdjLocation] = useState('main')
  const [transferQty, setTransferQty] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const barcodeRef = useRef<HTMLInputElement>(null)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef<any>(null)

  React.useEffect(()=>{api?.inventory?.listUnits?.().then((r:any)=>{if(r?.length)setDbUnits(r.map((u:any)=>({value:u.id,label:u.name})))}).catch(()=>{})}, [])
  const UNITS = dbUnits.length>0?dbUnits:DEFAULT_UNITS

  const filtered = useMemo(()=>{
    let list = ings
    if(search.trim()) list = list.filter(i=>i.name.includes(search.trim()))
    if(filter==='low') list = list.filter(i=>i.low_threshold>0&&(i.stock_main??i.stock??0)+(i.stock_kitchen??0)<=i.low_threshold)
    if(filter==='good') list = list.filter(i=>!i.low_threshold||(i.stock_main??i.stock??0)+(i.stock_kitchen??0)>i.low_threshold)
    return list
  },[ings,search,filter])
  const paged = usePaginated(filtered, 10)

  const onBarcodeKey = (e:React.KeyboardEvent)=>{if(e.key==='Enter'){if(barcodeBuffer.current.length>=6){api?.inventory?.findByBarcode?.(barcodeBuffer.current).then((f:any)=>f?(setShowAdj(f),setAdjType('add'),toast(`باركود: ${f.name}`)):toast('لم يتم العثور')).catch(()=>toast('خطأ'))}barcodeBuffer.current='';return}barcodeBuffer.current+=e.key;clearTimeout(barcodeTimer.current);barcodeTimer.current=setTimeout(()=>{barcodeBuffer.current=''},150)}

  const addItem = async()=>{
    if(!form.name)return
    try{
      await api?.inventory?.createItem?.({name:form.name,unit:form.unit,stock:parseFloat(form.stock||'0'),lowThreshold:parseFloat(form.lowThreshold||'0'),costPerUnit:form.costPerUnit?parseFloat(form.costPerUnit):null,barcode:form.barcode||null,type:form.type})
      toast('تمت الإضافة');load();setShowAdd(false);setForm({name:'',unit:'g',stock:'0',lowThreshold:'0',costPerUnit:'',barcode:'',type:'ingredient'})
    }catch(err:any){toast(err.message||'خطأ في الإضافة')}
  }
  const updateItem = async()=>{
    if(!showEdit)return
    try{
      await api?.inventory?.updateItem?.(showEdit.id,{name:showEdit.name,unit:showEdit.unit,lowThreshold:parseFloat(showEdit.low_threshold||'0'),costPerUnit:showEdit.cost_per_unit?parseFloat(showEdit.cost_per_unit):null,barcode:showEdit.barcode||null,type:showEdit.type})
      toast('تم التعديل');load();setShowEdit(null)
    }catch(err:any){toast(err.message||'خطأ في التعديل')}
  }

  const doTransfer = async()=>{
    if(!showTransfer||!transferQty)return
    const from = transferDir==='toKitchen'?'main':'kitchen'
    const to = transferDir==='toKitchen'?'kitchen':'main'
    const label = transferDir==='toKitchen'?'للمطبخ':'للمستودع'
    try{
      await api?.inventory?.transfer?.({itemId:showTransfer.id,fromLocation:from,toLocation:to,quantity:parseFloat(transferQty),note:transferNote||null})
      toast(`تم تحويل "${showTransfer.name}" ${label}`);load();setShowTransfer(null);setTransferQty('');setTransferNote('')
    }catch(err:any){toast(err.message||'خطأ')}
  }

  const doAdjust = async()=>{
    if(!showAdj||!adjQty)return
    try{
      if(!adjReason){toast('السبب مطلوب');return}
      if(adjType==='correction') await api?.inventory?.correctStock?.({itemId:showAdj.id,locationId:adjLocation,newQuantity:parseFloat(adjQty),reason:adjReason})
      else if(adjType==='damage') await api?.inventory?.reportDamage?.({itemId:showAdj.id,quantity:parseFloat(adjQty),locationId:adjLocation,reason:adjReason})
      else await api?.inventory?.adjust?.(showAdj.id,parseFloat(adjQty),adjType,adjReason,undefined,adjLocation)
      toast(`تم تعديل "${showAdj.name}"`);load();setShowAdj(null);setAdjQty('');setAdjReason('');setAdjLocation('main')
    }catch(err:any){toast(err.message||'خطأ')}
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',gap:12}}>
      <input ref={barcodeRef} onKeyDown={onBarcodeKey as any} style={{position:'absolute',opacity:0,width:0,height:0}}/>
      {/* Toolbar */}
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <Inp value={search} onChange={(e:any)=>setSearch(e.target.value)} placeholder="🔍 ابحث…" style={{flex:'1 1 200px',minWidth:150}}/>
        <div style={{display:'flex',gap:4}}>
          {([['all','الكل'],['low','⚠ منخفض'],['good','✓ جيد']] as const).map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)} style={{padding:'6px 14px',borderRadius:99,fontSize:13,fontWeight:filter===k?800:500,border:`1.5px solid ${filter===k?P.purple:P.borderM}`,background:filter===k?P.purple:P.surface,color:filter===k?'#fff':P.muted,cursor:'pointer',fontFamily:'Tajawal,sans-serif',transition:'all .15s'}}>{l}</button>
          ))}
        </div>
        <Btn variant="secondary" icon="search" onClick={()=>barcodeRef.current?.focus()}>باركود</Btn>
        <Btn variant="primary" icon="plus" onClick={()=>setShowAdd(true)}>إضافة</Btn>
      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:'auto',minHeight:0}}>
        <ResponsiveTable minWidth={820} stickyHeader>
        <table style={{width:'100%',minWidth:820,borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:`2px solid ${P.border}`,background:P.surface,position:'sticky',top:0}}>
            {['المنتج','النوع','الوحدة','المستودع','المطبخ','الحد','الحالة','التكلفة',''].map(h=><th key={h} style={{padding:'10px 12px',fontSize:13,color:P.muted,fontWeight:700,textAlign:'right'}}>{h}</th>)}
          </tr></thead>
          <tbody>{paged.pageRows.map(ing=>{
            const total=(ing.stock_main??ing.stock??0)+(ing.stock_kitchen??0)
            const st=ing.low_threshold>0&&total<=ing.low_threshold?'low':ing.low_threshold>0&&total<=ing.low_threshold*2?'ok':'good'
            const sc={low:{c:P.rose,bg:P.roseXL,l:'منخفض'},ok:{c:P.gold,bg:P.goldXL,l:'مقبول'},good:{c:P.green,bg:P.greenXL,l:'جيد'}}[st]
            return(<tr key={ing.id} style={{borderBottom:`1px solid ${P.border}`}} onMouseEnter={e=>e.currentTarget.style.background=P.bg2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <td style={{padding:'11px 12px',fontSize:15,fontWeight:700,color:P.plum}}>{ing.name}</td>
              <td style={{padding:'11px 12px'}}><span style={{background:ing.type==='premade'?P.purpleXL:P.bg2,color:ing.type==='premade'?P.purple:P.muted,padding:'2px 8px',borderRadius:99,fontSize:12,fontWeight:700}}>{ing.type==='premade'?'جاهز':'مكوّن'}</span></td>
              <td style={{padding:'11px 12px',fontSize:14,color:P.muted}}>{ing.unit}</td>
              <td style={{padding:'11px 12px',fontSize:15,fontWeight:900,color:P.plum}}>{ing.stock_main??ing.stock??0}</td>
              <td style={{padding:'11px 12px',fontSize:15,fontWeight:900,color:P.gold}}>{ing.stock_kitchen??0}</td>
              <td style={{padding:'11px 12px',fontSize:14,color:P.muted}}>{ing.low_threshold}</td>
              <td style={{padding:'11px 12px'}}><span style={{background:sc.bg,color:sc.c,padding:'3px 10px',borderRadius:99,fontSize:13,fontWeight:700}}>{sc.l}</span></td>
              <td style={{padding:'11px 12px',fontSize:14,color:P.muted}}>{ing.cost_per_unit||'—'}</td>
              <td style={{padding:'11px 12px'}}><div style={{display:'flex',gap:4}}>
                <button title="تعديل" onClick={()=>setShowEdit({...ing})} style={{padding:'4px 8px',background:P.ghost,border:`1px solid ${P.borderM}`,borderRadius:7,color:P.purple,cursor:'pointer',display:'flex',alignItems:'center'}}><Icon name="edit" size={13} color={P.purple}/></button>
                {ing.type!=='premade'&&<>
                  <button title="تحويل" onClick={()=>{setShowTransfer(ing);setTransferDir('toKitchen')}} style={{padding:'4px 8px',background:P.goldXL,border:`1px solid ${P.goldL}`,borderRadius:7,color:P.gold,cursor:'pointer',fontSize:12,fontFamily:'Tajawal,sans-serif',fontWeight:800}}>⇄ تحويل</button>
                  <button onClick={()=>{setShowAdj(ing);setAdjType('add')}} style={{padding:'4px 8px',background:P.greenXL,border:`1px solid ${P.greenL}`,borderRadius:7,color:P.green,cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:800}}>+</button>
                  <button onClick={()=>{setShowAdj(ing);setAdjType('remove')}} style={{padding:'4px 8px',background:P.roseXL,border:`1px solid ${P.roseL}`,borderRadius:7,color:P.rose,cursor:'pointer',fontSize:13,fontFamily:'Tajawal,sans-serif',fontWeight:800}}>−</button>
                </>}
                <button onClick={()=>setConfirmDel({id:ing.id,name:ing.name})} style={{padding:'4px 8px',background:P.ghost,border:`1px solid ${P.borderM}`,borderRadius:7,color:P.rose,cursor:'pointer',display:'flex',alignItems:'center'}}><Icon name="del" size={13} color={P.rose}/></button>
              </div></td>
            </tr>)
          })}</tbody>
        </table></ResponsiveTable>
        {filtered.length===0&&<div style={{padding:48,textAlign:'center',color:P.faint}}><div style={{fontSize:40,marginBottom:8}}>📦</div><div style={{fontSize:15,fontWeight:700}}>{search?'لا توجد نتائج':'لا توجد مكونات بعد'}</div></div>}
      </div>
      <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} startIndex={paged.startIndex} endIndex={paged.endIndex} onChange={paged.setPage}/>

      {/* Modals */}
      {showAdd&&<Modal title="إضافة منتج" onClose={()=>setShowAdd(false)} width={420} icon="plus">
        <Field label="الاسم" required><Inp value={form.name} onChange={(e:any)=>setForm({...form,name:e.target.value})} autoFocus/></Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><Field label="النوع"><Sel value={form.type} onChange={(e:any)=>setForm({...form,type:e.target.value})} options={[{value:'ingredient',label:'مكوّن خام'},{value:'premade',label:'منتج جاهز'}]}/></Field><Field label="الوحدة"><Sel value={form.unit} onChange={(e:any)=>setForm({...form,unit:e.target.value})} options={UNITS}/></Field></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><Field label="التكلفة لكل وحدة"><Inp value={form.costPerUnit} onChange={(e:any)=>setForm({...form,costPerUnit:e.target.value})} type="number"/></Field><Field label="الباركود"><Inp value={form.barcode} onChange={(e:any)=>setForm({...form,barcode:e.target.value})}/></Field></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><Field label="الكمية الأولية"><Inp value={form.stock} onChange={(e:any)=>setForm({...form,stock:e.target.value})} type="number"/></Field><Field label="الحد الأدنى"><Inp value={form.lowThreshold} onChange={(e:any)=>setForm({...form,lowThreshold:e.target.value})} type="number"/></Field></div>
        <div style={{display:'flex',gap:10,marginTop:4}}><Btn variant="secondary" onClick={()=>setShowAdd(false)} style={{flex:1}}>إلغاء</Btn><Btn variant="primary" onClick={addItem} style={{flex:1}}>حفظ</Btn></div>
      </Modal>}

      {showEdit&&<Modal title={`تعديل · ${showEdit.name}`} onClose={()=>setShowEdit(null)} width={420} icon="edit">
        <Field label="الاسم" required><Inp value={showEdit.name} onChange={(e:any)=>setShowEdit({...showEdit,name:e.target.value})}/></Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><Field label="النوع"><Sel value={showEdit.type} onChange={(e:any)=>setShowEdit({...showEdit,type:e.target.value})} options={[{value:'ingredient',label:'مكوّن خام'},{value:'premade',label:'منتج جاهز'}]}/></Field><Field label="الوحدة"><Sel value={showEdit.unit} onChange={(e:any)=>setShowEdit({...showEdit,unit:e.target.value})} options={UNITS}/></Field></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><Field label="التكلفة لكل وحدة"><Inp value={String(showEdit.cost_per_unit||'')} onChange={(e:any)=>setShowEdit({...showEdit,cost_per_unit:e.target.value})} type="number"/></Field><Field label="الباركود"><Inp value={showEdit.barcode||''} onChange={(e:any)=>setShowEdit({...showEdit,barcode:e.target.value})}/></Field></div>
        <Field label="الحد الأدنى"><Inp value={String(showEdit.low_threshold||'0')} onChange={(e:any)=>setShowEdit({...showEdit,low_threshold:e.target.value})} type="number"/></Field>
        <div style={{display:'flex',gap:10,marginTop:8}}><Btn variant="secondary" onClick={()=>setShowEdit(null)} style={{flex:1}}>إلغاء</Btn><Btn variant="primary" icon="save" onClick={updateItem} style={{flex:1}}>حفظ</Btn></div>
      </Modal>}

      {showAdj&&<Modal title={`تعديل مخزون · ${showAdj.name}`} onClose={()=>setShowAdj(null)} width={380} icon="layers">
        <div style={{display:'flex',gap:7,marginBottom:14,flexWrap:'wrap'}}>{[{k:'add',l:'إضافة'},{k:'remove',l:'سحب'},{k:'waste',l:'هدر'},{k:'damage',l:'تالف'},{k:'correction',l:'تصحيح'}].map(t=><button key={t.k} onClick={()=>setAdjType(t.k)} style={{flex:1,minWidth:60,padding:'8px',borderRadius:9,border:`1.5px solid ${adjType===t.k?P.purple:P.borderM}`,background:adjType===t.k?P.ghost:'transparent',color:adjType===t.k?P.purple:P.muted,cursor:'pointer',fontSize:12,fontWeight:adjType===t.k?800:400,fontFamily:'Tajawal,sans-serif'}}>{t.l}</button>)}</div>
        <Field label="الموقع"><Sel value={adjLocation} onChange={(e:any)=>setAdjLocation(e.target.value)} options={[{value:'main',label:'المستودع'},{value:'kitchen',label:'المطبخ'}]}/></Field>
        <Field label={adjType==='correction'?'الكمية الجديدة':'الكمية'} required><Inp value={adjQty} onChange={(e:any)=>setAdjQty(e.target.value)} type="number"/></Field>
        <Field label="السبب" required><Inp value={adjReason} onChange={(e:any)=>setAdjReason(e.target.value)} placeholder="سبب التعديل"/></Field>
        <div style={{display:'flex',gap:8,marginTop:4}}><Btn variant="secondary" onClick={()=>setShowAdj(null)} style={{flex:1}}>إلغاء</Btn><Btn variant="primary" onClick={doAdjust} style={{flex:1}}>تطبيق</Btn></div>
      </Modal>}

      {showTransfer&&<Modal title={`تحويل · ${showTransfer.name}`} onClose={()=>setShowTransfer(null)} width={400} icon="layers">
        <div style={{display:'flex',gap:6,marginBottom:14}}>
          {([['toKitchen','مستودع → مطبخ'],['toMain','مطبخ → مستودع']] as const).map(([k,l])=>(
            <button key={k} onClick={()=>setTransferDir(k)} style={{flex:1,padding:'8px',borderRadius:9,border:`1.5px solid ${transferDir===k?P.purple:P.borderM}`,background:transferDir===k?P.ghost:'transparent',color:transferDir===k?P.purple:P.muted,cursor:'pointer',fontSize:13,fontWeight:transferDir===k?800:400,fontFamily:'Tajawal,sans-serif'}}>{l}</button>
          ))}
        </div>
        <div style={{background:transferDir==='toKitchen'?P.goldXL:P.purpleXL,border:`1px solid ${transferDir==='toKitchen'?P.goldL:P.purpleL}`,borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:13,color:transferDir==='toKitchen'?P.gold:P.purple,fontWeight:700}}>
          {transferDir==='toKitchen'?`مخزون المستودع: ${showTransfer.stock_main??showTransfer.stock??0} ${showTransfer.unit}`:`مخزون المطبخ: ${showTransfer.stock_kitchen??0} ${showTransfer.unit}`}
        </div>
        <Field label={`الكمية (${showTransfer.unit})`} required><Inp value={transferQty} onChange={(e:any)=>setTransferQty(e.target.value)} type="number"/></Field>
        <Field label="ملاحظة"><Inp value={transferNote} onChange={(e:any)=>setTransferNote(e.target.value)} placeholder="اختياري"/></Field>
        <div style={{display:'flex',gap:8,marginTop:4}}><Btn variant="secondary" onClick={()=>setShowTransfer(null)} style={{flex:1}}>إلغاء</Btn><Btn variant="primary" onClick={doTransfer} style={{flex:1}}>تحويل</Btn></div>
      </Modal>}

      {confirmDel&&<Modal title="تأكيد الحذف" onClose={()=>setConfirmDel(null)} width={380} icon="alert">
        <div style={{textAlign:'center',marginBottom:16}}>
          <div style={{width:54,height:54,borderRadius:'50%',background:P.roseXL,border:`2px solid ${P.roseL}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><Icon name="alert" size={26} color={P.rose}/></div>
          <div style={{fontSize:16,fontWeight:800,color:P.plum}}>هل تريد حذف "{confirmDel.name}"؟</div>
          <div style={{fontSize:14,color:P.muted,marginTop:6}}>إذا كان مرتبطاً بعمليات سابقة سيتم أرشفته فقط</div>
        </div>
        <div style={{display:'flex',gap:8}}><Btn variant="secondary" style={{flex:1}} onClick={()=>setConfirmDel(null)}>إلغاء</Btn><Btn variant="danger" style={{flex:1}} onClick={async()=>{try{await api?.inventory?.deleteItem?.(confirmDel.id);toast('تم الحذف/الأرشفة');load();setConfirmDel(null)}catch(err:any){toast(err.message||'خطأ في الحذف')}}}>حذف</Btn></div>
      </Modal>}
    </div>
  )
}
