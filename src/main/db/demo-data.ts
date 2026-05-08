import { getDb } from './connection'
import bcrypt from 'bcryptjs'

export function runDemoData(): void {
  const db = getDb()
  const has = (db.prepare(`SELECT COUNT(*) as c FROM orders`).get() as any).c
  if (has > 0) { console.log('[Demo] already exists'); return }
  console.log('[Demo] Generating realistic inflation-adjusted demo data...')

  const tx = db.transaction(() => {
    const pinHash = bcrypt.hashSync('1234', 10)

    // ── Staff ──
    const mgrPerms = '["pos_access","pos_void","pos_discount","shift_manage","transactions_view","menu_manage","inventory_manage","purchase_manage","customers_manage","reports_view","users_manage","kitchen_view"]'
    const cshPerms = '["pos_access","shift_manage","transactions_view"]'
    const kitPerms = '["kitchen_view"]'

    db.prepare(`INSERT INTO employees (name, username, role, pin_hash, password_hash, permissions) VALUES (?,?,?,?,?,?)`).run('سارة عبدالله', 'sara', 'manager', pinHash, pinHash, mgrPerms)
    db.prepare(`INSERT INTO employees (name, username, role, pin_hash, password_hash, permissions) VALUES (?,?,?,?,?,?)`).run('أحمد محمد', 'ahmed', 'cashier', pinHash, pinHash, cshPerms)
    db.prepare(`INSERT INTO employees (name, username, role, pin_hash, password_hash, permissions) VALUES (?,?,?,?,?,?)`).run('فاطمة حسن', 'fatima', 'cashier', pinHash, pinHash, cshPerms)
    db.prepare(`INSERT INTO employees (name, username, role, pin_hash, password_hash, permissions) VALUES (?,?,?,?,?,?)`).run('خالد عثمان', 'khalid', 'kitchen', pinHash, pinHash, kitPerms)

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

    // ── Inventory Items (SDG Inflation Costs) ──
    const ingStmt = db.prepare(`INSERT INTO inventory_items (name,unit,stock,low_threshold,cost_per_unit,type) VALUES (?,?,?,?,?,?)`)
    const ings: [string,string,number,number,number,string][] = [
      ['حليب طازج','l',60,15,6000,'ingredient'],
      ['بن إسبريسو أرابيكا','kg',8,2,25000,'ingredient'],
      ['شوكولاتة بلجيكية','kg',6,1.5,45000,'ingredient'],
      ['سكر أبيض','kg',30,8,5500,'ingredient'],
      ['بيض بلدي','pcs',150,40,150,'ingredient'],
      ['زبدة فرنسية','kg',8,2,30000,'ingredient'],
      ['كريمة خفق','l',25,8,12000,'ingredient'],
      ['فانيليا مدغشقر','ml',2500,600,200,'ingredient'],
      ['فراولة طازجة','kg',12,4,15000,'ingredient'],
      ['مانجو طازج','kg',10,3,18000,'ingredient'],
      ['توت مشكل مجمد','kg',6,2,22000,'ingredient'],
      ['طحين أبيض','kg',25,8,5000,'ingredient'],
      ['جبن كريمي','kg',8,2,28000,'ingredient'],
      ['لوتس بسكويت','kg',4,1,18000,'ingredient'],
      ['نوتيلا','kg',5,1.5,24000,'ingredient'],
      ['فستق حلبي','kg',2,0.5,50000,'ingredient'],
      ['شاي سيلاني','kg',3,0.5,15000,'ingredient'],
      ['حليب شوفان','l',15,5,9000,'ingredient'],
      ['برتقال','kg',20,5,8000,'ingredient'],
      ['ليمون','kg',8,2,6000,'ingredient'],
      ['نعناع طازج','pcs',30,10,1000,'ingredient'],
      ['صوص كراميل جاهز','l',5,2,18000,'premade'],
      ['عجينة كرواسون مجمدة','pcs',60,20,5500,'premade'],
      ['كنافة جاهزة','kg',4,1,16000,'premade'],
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
    pkgStmt.run(23,'كرتونة 24 قطعة',24); pkgStmt.run(7,'كرتونة 6 لتر',6)

    // ── Recipes ──
    const rStmt = db.prepare(`INSERT INTO recipes (item_id,ingredient_id,quantity) VALUES (?,?,?)`)
    // Americano(2): coffee
    rStmt.run(2,2,0.02)
    // Latte(3) & Cappuccino(4): milk+coffee
    rStmt.run(3,1,0.25); rStmt.run(3,2,0.02)
    rStmt.run(4,1,0.2); rStmt.run(4,2,0.02)
    // Mocha(6): milk+coffee+chocolate
    rStmt.run(6,1,0.25); rStmt.run(6,2,0.02); rStmt.run(6,3,0.03)

    // ── Suppliers ──
    const sStmt = db.prepare(`INSERT INTO suppliers (name,phone,notes) VALUES (?,?,?)`)
    sStmt.run('مزرعة النيل للألبان','0918001001','توصيل يومي صباحاً — حليب وكريمة وزبدة')
    sStmt.run('البن الذهبي للقهوة','0918002002','توصيل أسبوعي — بن وشوكولاتة')
    sStmt.run('سوق الفواكه المركزي','0918003003','طلب حسب الحاجة — فواكه طازجة')
    sStmt.run('مخابز الشرق','0918004004','توصيل يومي — عجينة كرواسون وكنافة')

    // ── Transfers ──
    const trStmt = db.prepare(`INSERT INTO inventory_transfers (item_id,from_location,to_location,quantity,employee_id,note,created_at) VALUES (?,?,?,?,?,?,?)`)
    trStmt.run(1,'main','kitchen',15,1,'تحويل صباحي',new Date().toISOString())
    trStmt.run(2,'main','kitchen',2,1,null,new Date().toISOString())
    trStmt.run(3,'main','kitchen',2,1,null,new Date().toISOString())

    // ── Damage ──
    const dmgStmt = db.prepare(`INSERT INTO stock_adjustments (ingredient_id,quantity,type,reason,employee_id,location_id,created_at) VALUES (?,?,?,?,?,?,?)`)
    dmgStmt.run(1,-2,'damage','حليب منتهي الصلاحية',5,'kitchen',new Date().toISOString())
    dmgStmt.run(9,-0.5,'damage','فراولة تالفة',5,'kitchen',new Date().toISOString())

    // ── Algorithmic 45-day Generation ──
    const items = db.prepare(`SELECT id,price,cost,name FROM items`).all() as any[]
    const cashiers = [2, 3, 4] // from employees inserted above
    const banks = ['بنك الخرطوم','بنك فيصل الإسلامي','بنكك','بنك أمدرمان الوطني']
    const payModes: ('cash'|'bank'|'split')[] = ['cash','cash','cash','bank','bank','bank','split']
    const discReasons = ['عميل دائم','عرض خاص','خصم الافتتاح','تعويض طلب سابق','عميل VIP']
    const expCats = ['مواد خام','صيانة','كهرباء','ماء','نظافة','غاز','تسويق']
    const pettyOut = ['شراء حليب طارئ','صيانة ماكينة القهوة','مستلزمات تنظيف','توصيل طلبيات','مصاريف نثرية']
    const pettyIn = ['إرجاع مبلغ زائد','إيداع من المدير']

    let orderNum = 1
    const shiftStmt = db.prepare(`INSERT INTO shifts (employee_id,opened_at,closed_at,open_float,close_float,total_orders,total_revenue) VALUES (?,?,?,?,?,?,?)`)
    const orderStmt = db.prepare(`INSERT INTO orders (client_order_id,order_num,subtotal,disc_amount,disc_reason,disc_type,disc_value,total,pay_mode,bank_name,bank_ref,cash_in,cash_change,cash_part,bank_part,customer_id,employee_id,shift_id,status,created_at,order_type,order_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    const oiStmt = db.prepare(`INSERT INTO order_items (order_id,item_id,qty,unit_price,unit_cost,variation_label,note) VALUES (?,?,?,?,?,?,?)`)
    const clockStmt = db.prepare(`INSERT INTO clock_log (employee_id,shift_id,type,created_at) VALUES (?,?,?,?)`)
    const pettyStmt = db.prepare(`INSERT INTO petty_cash (type,amount,reason,shift_id,employee_id,created_at) VALUES (?,?,?,?,?,?)`)
    const expStmt = db.prepare(`INSERT INTO expenses (amount,category,note,shift_id,employee_id,created_at) VALUES (?,?,?,?,?,?)`)
    const logStmt = db.prepare(`INSERT INTO action_log (employee_id,action,detail,created_at) VALUES (?,?,?,?)`)

    function rng(a:number,b:number){return Math.floor(Math.random()*(b-a+1))+a}
    function pick<T>(a:T[]):T{return a[Math.floor(Math.random()*a.length)]}

    // Set span to exactly 45 days up to today
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setDate(start.getDate() - 44)
    start.setHours(0, 0, 0, 0)
    
    const day = new Date(start)
    const custSpend: Record<number,number> = {}, custVisit: Record<number,number> = {}

    while (day <= end) {
      const dow = day.getDay()
      const isWeekend = dow === 5 || dow === 6
      const numShifts = dow === 5 ? 1 : (Math.random() > 0.25 ? 2 : 1)

      for (let s = 0; s < numShifts; s++) {
        const ss = new Date(day)
        if (numShifts === 1) ss.setHours(9,0,0); else ss.setHours(s===0?8:16,0,0)
        const se = new Date(ss)
        if (numShifts === 1) se.setHours(22,0,0); else se.setHours(s===0?16:23,0,0)

        const cid = pick(cashiers)
        const openFloat = rng(50, 150) * 1000 // 50k - 150k float
        const shiftId = Number(shiftStmt.run(cid,ss.toISOString(),se.toISOString(),openFloat,null,0,0).lastInsertRowid)
        clockStmt.run(cid,shiftId,'in',ss.toISOString())
        clockStmt.run(5,shiftId,'in',new Date(ss.getTime()+15*60000).toISOString())
        logStmt.run(cid,'SESSION_LOGIN',JSON.stringify({shiftId,openFloat}),ss.toISOString())

        const numOrders = isWeekend ? rng(15,25) : rng(10,20)
        let shiftRev = 0, shiftOrd = 0

        for (let o = 0; o < numOrders; o++) {
          const oTime = new Date(ss.getTime() + Math.random()*(se.getTime()-ss.getTime()))
          const numItems = rng(1,4)
          const oItems: any[] = []
          let subtotal = 0

          for (let i = 0; i < numItems; i++) {
            const item = pick(items)
            const qty = rng(1,3)
            const priceAdj = Math.random()>0.5 ? pick([2000, 3000, 5000, 8000]) : 0
            const price = item.price + priceAdj
            subtotal += price * qty
            const varLabels = ['حجم كبير', 'إضافة شوت إسبريسو', 'حليب شوفان', 'مكسرات مشكلة']
            oItems.push({itemId:item.id,qty,price,cost:item.cost,varLabel:priceAdj>0?pick(varLabels):null,note:Math.random()<0.05?pick(['بدون سكر','إضافي كريمة','ساخن جداً']):null})
          }

          let dAmt=0, dType:string|null=null, dVal:number|null=null, dReason:string|null=null
          if (Math.random()<0.12) {
            if (Math.random()>0.5){dType='pct';dVal=pick([5,10,15,20]);dAmt=Math.round(subtotal*dVal/100)}
            else{dType='amt';dVal=pick([5000,10000,15000]);dAmt=dVal}
            dReason=pick(discReasons)
          }
          const total = Math.max(0,subtotal-dAmt)
          const pm = pick(payModes)
          let bn:string|null=null,br:string|null=null,ci:number|null=null,cc:number|null=null,cp:number|null=null,bp:number|null=null
          if(pm==='cash'){ci=Math.ceil(total/1000)*1000+(Math.random()>0.5?5000:0);cc=ci-total}
          else if(pm==='bank'){bn=pick(banks);br=`REF${rng(100000,999999)}`}
          else{cp=Math.round(total*rng(30,70)/100);bp=total-cp;bn=pick(banks);br=`REF${rng(100000,999999)}`}

          const custId = Math.random()<0.35 ? rng(1,20) : null
          const status = Math.random()<0.025 ? 'voided' : 'confirmed'
          const oType = Math.random()<0.25 ? 'takeaway' : 'local'
          const oNote = Math.random()<0.03 ? pick(['طاولة 5','طلب عاجل','انتظار العميل']) : null

          const ordId = Number(orderStmt.run(`demo-${orderNum}`,orderNum,subtotal,dAmt,dReason,dType,dVal,total,pm,bn,br,ci,cc,cp,bp,custId,cid,shiftId,status,oTime.toISOString(),oType,oNote).lastInsertRowid)
          for (const oi of oItems) oiStmt.run(ordId,oi.itemId,oi.qty,oi.price,oi.cost||0,oi.varLabel,oi.note)

          if(status==='confirmed'){shiftRev+=total;shiftOrd++;if(custId){custSpend[custId]=(custSpend[custId]||0)+total;custVisit[custId]=(custVisit[custId]||0)+1}}
          logStmt.run(cid,status==='voided'?'ORDER_VOID':'ORDER_CREATED',JSON.stringify({orderId:ordId,orderNum,total}),oTime.toISOString())
          orderNum++
        }

        // Petty cash
        for (let p=0;p<rng(0,2);p++){
          const pt=new Date(ss.getTime()+rng(1,6)*3600000)
          const pType=Math.random()>0.3?'out':'in'
          pettyStmt.run(pType,pick([5000,10000,20000,50000]),pick(pType==='out'?pettyOut:pettyIn),shiftId,cid,pt.toISOString())
        }
        // Expenses
        if(s===0){for(let e=0;e<rng(0,2);e++){
          const et=new Date(ss.getTime()+rng(2,7)*3600000)
          const ec=pick(expCats)
          expStmt.run(ec==='كهرباء'?rng(80,150)*1000:rng(20,80)*1000,ec,null,shiftId,1,et.toISOString())
        }}

        db.prepare(`UPDATE shifts SET total_orders=?,total_revenue=?,close_float=? WHERE id=?`).run(shiftOrd,shiftRev,openFloat+shiftRev,shiftId)
        clockStmt.run(cid,shiftId,'out',se.toISOString())
        clockStmt.run(5,shiftId,'out',new Date(se.getTime()-10*60000).toISOString())
        logStmt.run(cid,'SESSION_LOGOUT',JSON.stringify({shiftId,revenue:shiftRev,orders:shiftOrd}),se.toISOString())
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
    console.log(`[Demo] Generated: ${oc} orders, ${sc} shifts, 20 customers`)
  } catch(err:any){console.error('[Demo] Failed:',err.message);throw err}
}
