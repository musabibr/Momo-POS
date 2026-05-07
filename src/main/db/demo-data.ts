import { getDb } from './connection'
import bcrypt from 'bcryptjs'

export function runDemoData(): void {
  const db = getDb()
  const has = (db.prepare(`SELECT COUNT(*) as c FROM orders`).get() as any).c
  if (has > 0) { console.log('[Demo] already exists'); return }
  console.log('[Demo] Generating realistic demo data...')

  const tx = db.transaction(() => {
    const pin = bcrypt.hashSync('1234', 10)
    const pin2 = bcrypt.hashSync('5678', 10)

    // ── Staff ──
    db.prepare(`INSERT INTO employees (name,role,pin_hash) VALUES (?,?,?)`).run('سارة عبدالله', 'manager', pin)
    db.prepare(`INSERT INTO employees (name,role,pin_hash) VALUES (?,?,?)`).run('أحمد محمد', 'cashier', pin2)
    db.prepare(`INSERT INTO employees (name,role,pin_hash) VALUES (?,?,?)`).run('فاطمة حسن', 'cashier', pin2)
    db.prepare(`INSERT INTO employees (name,role,pin_hash) VALUES (?,?,?)`).run('خالد عثمان', 'kitchen', pin2)

    // ── Customers ──
    const custStmt = db.prepare(`INSERT INTO customers (name,phone,is_vip,is_blacklist,points,total_spend,visit_count) VALUES (?,?,?,?,?,?,?)`)
    const custs: [string,string,number][] = [
      ['ريم أحمد','0912345001',1],['محمد علي','0912345002',0],
      ['هالة عمر','0912345003',1],['يوسف إبراهيم','0912345004',0],
      ['نور الدين','0912345005',0],['سلمى حسن','0912345006',1],
      ['عبدالله محمود','0912345007',0],['مريم خالد','0912345008',0],
      ['أمير طارق','0912345009',0],['دانية صالح','0912345010',0],
      ['حسام الدين','0912345011',0],['رغد عادل','0912345012',0],
      ['بشرى موسى','0912345013',0],['طلال جمال','0912345014',0],
      ['آمنة بكري','0912345015',1],['فيصل عثمان','0912345016',0],
      ['شهد نبيل','0912345017',0],['معتز كمال','0912345018',0],
      ['لمياء حامد','0912345019',0],['زياد منصور','0912345020',0],
    ]
    for (const [n,p,v] of custs) custStmt.run(n,p,v,0,0,0,0)

    // ── Inventory Items ──
    const ingStmt = db.prepare(`INSERT INTO inventory_items (name,unit,stock,low_threshold,cost_per_unit,type) VALUES (?,?,?,?,?,?)`)
    const ings: [string,string,number,number,number,string][] = [
      ['حليب طازج','l',60,15,8,'ingredient'],
      ['بن إسبريسو أرابيكا','kg',8,2,140,'ingredient'],
      ['شوكولاتة بلجيكية','kg',6,1.5,220,'ingredient'],
      ['سكر أبيض','kg',30,8,12,'ingredient'],
      ['بيض بلدي','pcs',150,40,4,'ingredient'],
      ['زبدة فرنسية','kg',8,2,95,'ingredient'],
      ['كريمة خفق','l',25,8,45,'ingredient'],
      ['فانيليا مدغشقر','ml',2500,600,0.6,'ingredient'],
      ['فراولة طازجة','kg',12,4,55,'ingredient'],
      ['مانجو طازج','kg',10,3,65,'ingredient'],
      ['توت مشكل مجمد','kg',6,2,90,'ingredient'],
      ['طحين أبيض','kg',25,8,10,'ingredient'],
      ['جبن كريمي','kg',8,2,120,'ingredient'],
      ['لوتس بسكويت','kg',4,1,85,'ingredient'],
      ['نوتيلا','kg',5,1.5,110,'ingredient'],
      ['فستق حلبي','kg',2,0.5,350,'ingredient'],
      ['شاي سيلاني','kg',3,0.5,80,'ingredient'],
      ['حليب شوفان','l',15,5,25,'ingredient'],
      ['برتقال','kg',20,5,30,'ingredient'],
      ['ليمون','kg',8,2,20,'ingredient'],
      ['نعناع طازج','pcs',30,10,5,'ingredient'],
      ['جبن حلوم','kg',5,1.5,130,'ingredient'],
      ['دجاج مدخن','kg',4,1,110,'ingredient'],
      ['خبز صامولي','pcs',40,12,8,'ingredient'],
      ['صوص كراميل جاهز','l',5,2,90,'premade'],
      ['عجينة كرواسون مجمدة','pcs',60,20,22,'premade'],
      ['كنافة جاهزة','kg',4,1,75,'premade'],
    ]
    for (const i of ings) ingStmt.run(...i)

    // Populate inventory_stock for both locations
    const allInv = db.prepare(`SELECT id, stock FROM inventory_items`).all() as any[]
    for (const item of allInv) {
      const kQty = Math.round(item.stock * 0.3)
      db.prepare(`INSERT OR REPLACE INTO inventory_stock (item_id,location_id,quantity) VALUES (?,'main',?)`).run(item.id, item.stock - kQty)
      db.prepare(`INSERT OR REPLACE INTO inventory_stock (item_id,location_id,quantity) VALUES (?,'kitchen',?)`).run(item.id, kQty)
    }

    // ── Packagings ──
    const pkgStmt = db.prepare(`INSERT INTO item_packagings (item_id,label,qty_per_base) VALUES (?,?,?)`)
    pkgStmt.run(1,'جالون 5 لتر',5); pkgStmt.run(2,'كيس 1 كيلو',1)
    pkgStmt.run(3,'علبة 2.5 كيلو',2.5); pkgStmt.run(4,'كيس 50 كيلو',50)
    pkgStmt.run(5,'كرتونة 30 بيضة',30); pkgStmt.run(12,'كيس 25 كيلو',25)
    pkgStmt.run(26,'كرتونة 24 قطعة',24); pkgStmt.run(7,'كرتونة 6 لتر',6)

    // ── Recipes ──
    const rStmt = db.prepare(`INSERT INTO recipes (item_id,ingredient_id,quantity) VALUES (?,?,?)`)
    // Latte(3): milk+coffee. Cappuccino(4): milk+coffee. Americano(2): coffee
    rStmt.run(3,1,0.25); rStmt.run(3,2,0.02)
    rStmt.run(4,1,0.2); rStmt.run(4,2,0.02)
    rStmt.run(2,2,0.02)
    // Mocha(6): milk+coffee+chocolate
    rStmt.run(6,1,0.25); rStmt.run(6,2,0.02); rStmt.run(6,3,0.03)
    // Crème brûlée(36): eggs+cream+vanilla+sugar
    rStmt.run(36,5,3); rStmt.run(36,7,0.2); rStmt.run(36,8,5); rStmt.run(36,4,0.05)
    // Lava cake(37): chocolate+butter+eggs+sugar
    rStmt.run(37,3,0.15); rStmt.run(37,6,0.1); rStmt.run(37,5,2); rStmt.run(37,4,0.04)
    // Mango juice(18): mango
    rStmt.run(18,10,0.3)
    // Strawberry juice(19): strawberry
    rStmt.run(19,9,0.3)
    // Cheesecake(26): cream cheese+cream+eggs
    rStmt.run(26,13,0.2); rStmt.run(26,7,0.1); rStmt.run(26,5,2)

    // ── Suppliers ──
    const sStmt = db.prepare(`INSERT INTO suppliers (name,phone,notes) VALUES (?,?,?)`)
    sStmt.run('مزرعة النيل للألبان','0918001001','توصيل يومي صباحاً — حليب وكريمة وزبدة')
    sStmt.run('البن الذهبي للقهوة','0918002002','توصيل أسبوعي — بن وشوكولاتة')
    sStmt.run('سوق الفواكه المركزي','0918003003','طلب حسب الحاجة — فواكه طازجة')
    sStmt.run('مخابز الشرق','0918004004','توصيل يومي — عجينة كرواسون وكنافة')
    sStmt.run('الموزع العام للمواد الغذائية','0918005005','طحين وسكر وبيض — طلب أسبوعي')

    // ── Purchases ──
    const pStmt = db.prepare(`INSERT INTO purchases (supplier_id,total_cost,note,employee_id,created_at) VALUES (?,?,?,?,?)`)
    const piStmt = db.prepare(`INSERT INTO purchase_items (purchase_id,item_id,quantity,packaging_id,packaging_qty,unit_cost,total_cost) VALUES (?,?,?,?,?,?,?)`)
    let pid: number
    // P1: Dairy
    pid = Number(pStmt.run(1,1040,'تموين أسبوع',1,'2026-03-03 07:30:00').lastInsertRowid)
    piStmt.run(pid,1,40,1,8,8,320); piStmt.run(pid,7,12,null,null,45,540); piStmt.run(pid,6,4,null,null,95,380)
    // P2: Coffee
    pid = Number(pStmt.run(2,1200,null,2,'2026-03-05 09:00:00').lastInsertRowid)
    piStmt.run(pid,2,4,2,4,140,560); piStmt.run(pid,3,2.5,3,1,220,550)
    // P3: Fruits
    pid = Number(pStmt.run(3,1380,'فواكه الأسبوع',1,'2026-03-08 07:00:00').lastInsertRowid)
    piStmt.run(pid,9,10,null,null,55,550); piStmt.run(pid,10,8,null,null,65,520); piStmt.run(pid,19,10,null,null,30,300)
    // P4: Bakery
    pid = Number(pStmt.run(4,1848,'معجنات',1,'2026-03-10 06:30:00').lastInsertRowid)
    piStmt.run(pid,26,48,7,2,22,1056); piStmt.run(pid,27,4,null,null,75,300)
    // P5: General
    pid = Number(pStmt.run(5,1480,'تموين عام',1,'2026-03-12 08:00:00').lastInsertRowid)
    piStmt.run(pid,4,50,4,1,12,600); piStmt.run(pid,5,120,5,4,4,480); piStmt.run(pid,12,25,6,1,10,250)

    // ── Transfers ──
    const trStmt = db.prepare(`INSERT INTO inventory_transfers (item_id,from_location,to_location,quantity,employee_id,note,created_at) VALUES (?,?,?,?,?,?,?)`)
    trStmt.run(1,'main','kitchen',15,1,'تحويل صباحي','2026-03-04 07:00:00')
    trStmt.run(2,'main','kitchen',2,1,null,'2026-03-04 07:05:00')
    trStmt.run(3,'main','kitchen',2,1,null,'2026-03-04 07:10:00')
    trStmt.run(5,'main','kitchen',30,5,'بيض للمطبخ','2026-03-05 07:00:00')
    trStmt.run(7,'main','kitchen',6,1,null,'2026-03-06 07:30:00')
    trStmt.run(9,'main','kitchen',4,1,'فراولة طازجة','2026-03-08 08:00:00')
    trStmt.run(10,'main','kitchen',3,1,null,'2026-03-08 08:05:00')
    trStmt.run(13,'main','kitchen',3,5,'جبن كريمي','2026-03-10 07:00:00')
    trStmt.run(26,'main','kitchen',24,5,'كرواسون','2026-03-10 06:45:00')

    // ── Damage ──
    const dmgStmt = db.prepare(`INSERT INTO stock_adjustments (ingredient_id,quantity,type,reason,employee_id,location_id,created_at) VALUES (?,?,?,?,?,?,?)`)
    dmgStmt.run(1,-2,'damage','حليب منتهي الصلاحية | خسارة: 16',5,'kitchen','2026-03-12 14:00:00')
    dmgStmt.run(9,-0.5,'damage','فراولة تالفة | خسارة: 27.5',5,'kitchen','2026-03-18 10:00:00')
    dmgStmt.run(25,-0.3,'damage','صوص انسكب | خسارة: 27',5,'kitchen','2026-03-22 16:00:00')

    // ── Generate 2 months of shifts + orders ──
    const items = db.prepare(`SELECT id,price,name FROM items`).all() as any[]
    const cashiers = [3,4]
    const banks = ['بنك الخرطوم','بنك فيصل الإسلامي','بنكك','بنك أمدرمان الوطني']
    const payModes: ('cash'|'bank'|'split')[] = ['cash','cash','cash','bank','bank','split']
    const discReasons = ['عميل دائم','عرض خاص','خصم الافتتاح','تعويض طلب سابق','عميل VIP']
    const expCats = ['مواد خام','صيانة','كهرباء','ماء','نظافة','غاز','تسويق']
    const pettyOut = ['شراء حليب طارئ','صيانة ماكينة القهوة','مستلزمات تنظيف','توصيل طلبيات','مصاريف نثرية']
    const pettyIn = ['إرجاع مبلغ زائد','إيداع من المدير']

    let orderNum = 1
    const shiftStmt = db.prepare(`INSERT INTO shifts (employee_id,opened_at,closed_at,open_float,close_float,total_orders,total_revenue) VALUES (?,?,?,?,?,?,?)`)
    const orderStmt = db.prepare(`INSERT INTO orders (client_order_id,order_num,subtotal,disc_amount,disc_reason,disc_type,disc_value,total,pay_mode,bank_name,bank_ref,cash_in,cash_change,cash_part,bank_part,customer_id,employee_id,shift_id,status,created_at,order_type,order_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    const oiStmt = db.prepare(`INSERT INTO order_items (order_id,item_id,qty,unit_price,variation_label,note) VALUES (?,?,?,?,?,?)`)
    const clockStmt = db.prepare(`INSERT INTO clock_log (employee_id,shift_id,type,created_at) VALUES (?,?,?,?)`)
    const pettyStmt = db.prepare(`INSERT INTO petty_cash (type,amount,reason,shift_id,employee_id,created_at) VALUES (?,?,?,?,?,?)`)
    const expStmt = db.prepare(`INSERT INTO expenses (amount,category,note,shift_id,employee_id,created_at) VALUES (?,?,?,?,?,?)`)
    const logStmt = db.prepare(`INSERT INTO action_log (employee_id,action,detail,created_at) VALUES (?,?,?,?)`)

    function rng(a:number,b:number){return Math.floor(Math.random()*(b-a+1))+a}
    function pick<T>(a:T[]):T{return a[Math.floor(Math.random()*a.length)]}
    function fmt(d:Date){return d.toISOString().replace('T',' ').slice(0,19)}

    const start = new Date('2026-03-01T00:00:00')
    const end = new Date('2026-04-30T23:59:59')
    const day = new Date(start)
    const custSpend: Record<number,number> = {}, custVisit: Record<number,number> = {}

    // Popular items weighted — coffee & pastry sell more than savory
    const hotIds = items.filter((i:any) => i.id <= 12).map((i:any) => i.id)
    const coldIds = items.filter((i:any) => i.id >= 13 && i.id <= 25).map((i:any) => i.id)
    const dessertIds = items.filter((i:any) => i.id >= 26 && i.id <= 40).map((i:any) => i.id)
    const otherIds = items.filter((i:any) => i.id > 40).map((i:any) => i.id)
    const weighted = [...hotIds,...hotIds,...hotIds,...coldIds,...coldIds,...dessertIds,...otherIds]

    while (day <= end) {
      const dow = day.getDay()
      const isWeekend = dow === 5 || dow === 6
      const numShifts = dow === 5 ? 1 : (Math.random() > 0.25 ? 2 : 1)

      for (let s = 0; s < numShifts; s++) {
        const ss = new Date(day)
        if (numShifts === 1) ss.setHours(9,0,0); else ss.setHours(s===0?8:16,0,0)
        const se = new Date(ss)
        if (numShifts === 1) se.setHours(22,0,0); else se.setHours(s===0?16:23,0,0)

        const cid = cashiers[s % 2]
        const openFloat = rng(5,15)*1000
        const shiftId = Number(shiftStmt.run(cid,fmt(ss),fmt(se),openFloat,null,0,0).lastInsertRowid)
        clockStmt.run(cid,shiftId,'in',fmt(ss))
        clockStmt.run(5,shiftId,'in',fmt(new Date(ss.getTime()+15*60000)))
        logStmt.run(cid,'SHIFT_OPEN',JSON.stringify({shiftId,openFloat}),fmt(ss))

        // Morning shifts busier for coffee; evening for desserts
        const numOrders = isWeekend ? rng(28,50) : rng(18,35)
        let shiftRev = 0, shiftOrd = 0

        for (let o = 0; o < numOrders; o++) {
          const oTime = new Date(ss.getTime() + Math.random()*(se.getTime()-ss.getTime()))
          const numItems = rng(1,4)
          const oItems: any[] = []
          let subtotal = 0

          for (let i = 0; i < numItems; i++) {
            const wId = pick(weighted)
            const item = items.find((x:any)=>x.id===wId) || pick(items)
            const qty = rng(1,3)
            const priceAdj = Math.random()>0.7 ? pick([0,200,300,400,600]) : 0
            const price = item.price + priceAdj
            subtotal += price * qty
            const varLabels = ['صغير','وسط','كبير']
            oItems.push({itemId:item.id,qty,price,varLabel:priceAdj>0?pick(varLabels):null,note:Math.random()<0.05?pick(['بدون سكر','إضافي كريمة','ساخن جداً']):null})
          }

          let dAmt=0, dType:string|null=null, dVal:number|null=null, dReason:string|null=null
          if (Math.random()<0.12) {
            if (Math.random()>0.5){dType='pct';dVal=pick([5,10,15,20]);dAmt=Math.round(subtotal*dVal/100)}
            else{dType='amt';dVal=pick([200,500,1000]);dAmt=dVal}
            dReason=pick(discReasons)
          }
          const total = Math.max(0,subtotal-dAmt)
          const pm = pick(payModes)
          let bn:string|null=null,br:string|null=null,ci:number|null=null,cc:number|null=null,cp:number|null=null,bp:number|null=null
          if(pm==='cash'){ci=Math.ceil(total/500)*500+(Math.random()>0.5?500:0);cc=ci-total}
          else if(pm==='bank'){bn=pick(banks);br=`REF${rng(100000,999999)}`}
          else{cp=Math.round(total*rng(30,70)/100);bp=total-cp;bn=pick(banks);br=`REF${rng(100000,999999)}`}

          const custId = Math.random()<0.35 ? rng(1,20) : null
          const status = Math.random()<0.025 ? 'voided' : 'confirmed'
          const oType = Math.random()<0.25 ? 'takeaway' : 'local'
          const oNote = Math.random()<0.03 ? pick(['طاولة 5','طلب عاجل','انتظار العميل']) : null

          const ordId = Number(orderStmt.run(`demo-${orderNum}`,orderNum,subtotal,dAmt,dReason,dType,dVal,total,pm,bn,br,ci,cc,cp,bp,custId,cid,shiftId,status,fmt(oTime),oType,oNote).lastInsertRowid)
          for (const oi of oItems) oiStmt.run(ordId,oi.itemId,oi.qty,oi.price,oi.varLabel,oi.note)

          if(status==='confirmed'){shiftRev+=total;shiftOrd++;if(custId){custSpend[custId]=(custSpend[custId]||0)+total;custVisit[custId]=(custVisit[custId]||0)+1}}
          logStmt.run(cid,status==='voided'?'ORDER_VOID':'ORDER_CONFIRM',JSON.stringify({orderId:ordId,orderNum,total}),fmt(oTime))
          orderNum++
        }

        // Petty cash
        for (let p=0;p<rng(0,2);p++){
          const pt=new Date(ss.getTime()+rng(1,6)*3600000)
          const pType=Math.random()>0.3?'out':'in'
          pettyStmt.run(pType,pick([500,1000,1500,2000,3000]),pick(pType==='out'?pettyOut:pettyIn),shiftId,cid,fmt(pt))
        }
        // Expenses (morning shift only)
        if(s===0){for(let e=0;e<rng(0,2);e++){
          const et=new Date(ss.getTime()+rng(2,7)*3600000)
          const ec=pick(expCats)
          expStmt.run(ec==='كهرباء'?rng(8,15)*1000:rng(1,8)*1000,ec,null,shiftId,1,fmt(et))
        }}

        db.prepare(`UPDATE shifts SET total_orders=?,total_revenue=?,close_float=? WHERE id=?`).run(shiftOrd,shiftRev,openFloat+shiftRev,shiftId)
        clockStmt.run(cid,shiftId,'out',fmt(se))
        clockStmt.run(5,shiftId,'out',fmt(new Date(se.getTime()-10*60000)))
        logStmt.run(cid,'SHIFT_CLOSE',JSON.stringify({shiftId,revenue:shiftRev,orders:shiftOrd}),fmt(se))
      }
      day.setDate(day.getDate()+1)
    }

    // Update customer totals
    const custUpd = db.prepare(`UPDATE customers SET total_spend=?,visit_count=?,points=? WHERE id=?`)
    for (const [cid,spend] of Object.entries(custSpend)) {
      custUpd.run(spend,custVisit[Number(cid)]||0,Math.floor(spend/1000),Number(cid))
    }
  })

  try {
    tx()
    const oc=(db.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c
    const sc=(db.prepare('SELECT COUNT(*) as c FROM shifts').get() as any).c
    console.log(`[Demo] Generated: ${oc} orders, ${sc} shifts, 20 customers, 27 inventory items, 5 suppliers`)
  } catch(err:any){console.error('[Demo] Failed:',err.message);throw err}
}
