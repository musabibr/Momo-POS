// Generates 015_seed_demo.sql with 2 busy workdays of data
const fs = require('fs');
const bcrypt = require('bcryptjs');
const h = bcrypt.hashSync('1234', 10);
const sa = bcrypt.hashSync('قطتي', 10);
let sql = `-- 015_seed_demo.sql — 2 full busy workdays of demo data\n`;
const w = s => sql += s + '\n';

// EMPLOYEES
w(`INSERT INTO employees (name,role,pin_hash,username,password_hash,permissions,security_question,security_answer_hash) VALUES`);
w(`('أحمد المسؤول','admin','${h}','admin','${h}','["*"]','ما اسم حيوانك الأليف؟','${sa}'),`);
w(`('سارة المديرة','manager','${h}','sara','${h}','["pos_access","pos_void","pos_discount","shift_manage","transactions_view","menu_manage","inventory_manage","purchase_manage","customers_manage","reports_view","users_manage","kitchen_view"]',NULL,NULL),`);
w(`('خالد الكاشير','cashier','${h}','khalid','${h}','["pos_access","shift_manage","transactions_view"]',NULL,NULL),`);
w(`('نورة كاشير+مخزون','cashier','${h}','noura','${h}','["pos_access","shift_manage","transactions_view","inventory_manage","reports_view"]',NULL,NULL),`);
w(`('محمد المطبخ','kitchen','${h}','kitchen1','${h}','["kitchen_view"]',NULL,NULL),`);
w(`('فاطمة مطبخ+طلبات','kitchen','${h}','fatima','${h}','["kitchen_view","pos_access","transactions_view"]',NULL,NULL);`);

// CATEGORIES
w(`INSERT INTO categories (id,name,color,sort_order) VALUES ('cat_drinks','المشروبات','#0e7490',0),('cat_coffee','القهوة','#b45309',1),('cat_pastry','المعجنات','#db2777',2),('cat_dessert','الحلويات','#9333ea',3),('cat_meals','الوجبات','#047857',4),('cat_sides','الإضافات','#7c3aed',5);`);

// ITEMS (20)
const items = [
  ['قهوة عربية',800,200,'cat_coffee','☕'],['لاتيه',1200,350,'cat_coffee','☕'],['كابتشينو',1200,350,'cat_coffee','☕'],
  ['موكا',1400,400,'cat_coffee','☕'],['إسبريسو',700,150,'cat_coffee','☕'],['شاي أخضر',600,100,'cat_drinks','🍵'],
  ['عصير برتقال',1000,300,'cat_drinks','🍊'],['عصير مانجو',1200,350,'cat_drinks','🥭'],['سموثي فراولة',1500,400,'cat_drinks','🍓'],
  ['كرواسون',800,250,'cat_pastry','🥐'],['كرواسون شوكولا',1000,300,'cat_pastry','🥐'],['فطيرة جبن',900,280,'cat_pastry','🧀'],
  ['كنافة',1500,500,'cat_dessert','🍮'],['بسبوسة',800,200,'cat_dessert','🍰'],['تشيز كيك',1800,600,'cat_dessert','🍰'],
  ['كيكة الشوكولا',1600,500,'cat_dessert','🎂'],['ساندويتش دجاج',2000,700,'cat_meals','🥪'],['برجر لحم',2500,900,'cat_meals','🍔'],
  ['سلطة سيزر',1800,500,'cat_meals','🥗'],['بطاطس مقلية',800,200,'cat_sides','🍟']
];
w(`INSERT INTO items (name,price,cost,cat_id,emoji,available) VALUES`);
w(items.map(i=>`('${i[0]}',${i[1]},${i[2]},'${i[3]}','${i[4]}',1)`).join(',\n')+';');

// OPTION GROUPS + OPTIONS
w(`INSERT INTO item_option_groups (item_id,name,type,kind,sort_order) VALUES (1,'الحجم','single','variation',0),(2,'الحجم','single','variation',0),(3,'الحجم','single','variation',0),(4,'الحجم','single','variation',0),(2,'نوع الحليب','single','modifier',1),(3,'نوع الحليب','single','modifier',1),(18,'الإضافات','multi','modifier',0),(17,'نوع الخبز','single','variation',0);`);
w(`INSERT INTO item_options (group_id,name,price_adj,is_default,sort_order) VALUES`);
w(`(1,'صغير',0,1,0),(1,'وسط',200,0,1),(1,'كبير',400,0,2),(2,'صغير',0,1,0),(2,'وسط',300,0,1),(2,'كبير',500,0,2),(3,'صغير',0,1,0),(3,'وسط',300,0,1),(3,'كبير',500,0,2),(4,'صغير',0,1,0),(4,'وسط',300,0,1),(4,'كبير',500,0,2),`);
w(`(5,'حليب عادي',0,1,0),(5,'حليب لوز',300,0,1),(5,'حليب شوفان',300,0,2),(6,'حليب عادي',0,1,0),(6,'حليب لوز',300,0,1),(6,'حليب شوفان',300,0,2),`);
w(`(7,'جبن إضافي',300,0,0),(7,'بيض',200,0,1),(7,'مخلل',0,0,2),(7,'صوص حار',0,0,3),(8,'صامولي',0,1,0),(8,'تورتيلا',200,0,1),(8,'خبز أسمر',100,0,2);`);

// INVENTORY
w(`INSERT INTO inventory_items (name,unit,stock,low_threshold,cost_per_unit,type) VALUES ('حبوب قهوة','kg',25,5,8000,'ingredient'),('حليب طازج','l',40,10,600,'ingredient'),('سكر','kg',30,5,400,'ingredient'),('شوكولا بودرة','kg',10,2,5000,'ingredient'),('دقيق','kg',50,10,300,'ingredient'),('زبدة','kg',15,3,3500,'ingredient'),('جبن كريمي','kg',8,2,6000,'ingredient'),('فراولة مجمدة','kg',12,3,4000,'ingredient'),('برتقال','kg',20,5,800,'ingredient'),('مانجو مجمد','kg',10,3,5000,'ingredient'),('دجاج','kg',15,5,3000,'ingredient'),('لحم بقر','kg',10,3,6000,'ingredient'),('خبز صامولي','pcs',100,20,50,'ingredient'),('بطاطس','kg',30,8,500,'ingredient'),('خس','kg',5,2,800,'ingredient');`);

w(`INSERT OR IGNORE INTO inventory_stock (item_id,location_id,quantity) VALUES (1,'main',25),(1,'kitchen',3),(2,'main',35),(2,'kitchen',5),(3,'main',28),(3,'kitchen',2),(4,'main',9),(4,'kitchen',1),(5,'main',45),(5,'kitchen',5),(6,'main',13),(6,'kitchen',2),(7,'main',7),(7,'kitchen',1),(8,'main',10),(8,'kitchen',2),(9,'main',18),(9,'kitchen',2),(10,'main',8),(10,'kitchen',2),(11,'main',12),(11,'kitchen',3),(12,'main',8),(12,'kitchen',2),(13,'main',80),(13,'kitchen',20),(14,'main',25),(14,'kitchen',5),(15,'main',4),(15,'kitchen',1);`);

w(`INSERT INTO recipes (item_id,ingredient_id,quantity) VALUES (1,1,0.015),(2,1,0.02),(2,2,0.2),(3,1,0.02),(3,2,0.15),(4,1,0.02),(4,2,0.15),(4,4,0.02),(7,9,0.3),(8,10,0.2),(9,8,0.15),(9,2,0.1),(10,5,0.1),(10,6,0.03),(13,7,0.05),(13,3,0.03),(17,11,0.15),(17,13,1),(17,15,0.05),(18,12,0.2),(18,13,1),(18,15,0.03),(20,14,0.2);`);

// SUPPLIERS
w(`INSERT INTO suppliers (name,phone,notes) VALUES ('مؤسسة القهوة الذهبية','0501234567','مورد حبوب القهوة'),('مزارع الوادي','0559876543','خضروات وفواكه'),('شركة الألبان المتحدة','0531112222','حليب وأجبان'),('مخابز النور','0547778888','خبز ومعجنات');`);
w(`INSERT INTO supplier_ingredients (supplier_id,ingredient_id,price_per_unit) VALUES (1,1,7500),(1,4,4800),(2,9,750),(2,10,4500),(2,8,3800),(2,15,700),(2,14,450),(3,2,550),(3,6,3200),(3,7,5500),(4,13,40),(4,5,280);`);

// CUSTOMERS
w(`INSERT INTO customers (name,phone,notes,is_vip,points,total_spend,visit_count) VALUES ('عبدالله الشمري','0551234567','عميل دائم',1,450,45000,30),('منيرة العتيبي','0539876543',NULL,0,120,12000,8),('فهد القحطاني','0541112233','حساسية مكسرات',1,800,80000,55),('ريم الدوسري','0567774444',NULL,0,50,5000,3),('سلطان الحربي','0522223333','يفضل التوصيل',0,200,20000,15);`);

// PACKAGINGS
w(`INSERT INTO item_packagings (item_id,label,qty_per_base) VALUES (1,'كيس 1 كجم',1000),(1,'كيس 250 جم',250),(2,'كرتون 12 لتر',12),(5,'كيس 25 كجم',25),(14,'كيس 10 كجم',10);`);

// SHIFTS: 4 shifts across 2 days
w(`INSERT INTO shifts (employee_id,opened_at,closed_at,open_float,close_float,total_orders,total_revenue) VALUES`);
w(`(1,'2026-05-05 08:00:00','2026-05-05 16:00:00',50000,385000,35,335000),`);
w(`(3,'2026-05-05 16:00:00','2026-05-06 00:00:00',50000,278000,28,228000),`);
w(`(2,'2026-05-06 08:00:00','2026-05-06 16:00:00',50000,420000,40,370000),`);
w(`(3,'2026-05-06 16:00:00','2026-05-07 00:00:00',50000,310000,30,260000);`);

// GENERATE ORDERS - ~60 orders across 4 shifts
const payModes = ['cash','bank','split'];
const banks = ['الراجحي','الأهلي','STC Pay','مدى'];
const types = ['local','takeaway','delivery'];
const tables = ['1','2','3','4','5','6','7','8','9','10',null];
const statuses = ['confirmed','confirmed','confirmed','confirmed','confirmed','confirmed','confirmed','confirmed','confirmed','voided']; // 10% void
const orderRows = [];
const oiRows = [];
let oid = 0;
const day1Base = new Date('2026-05-05T08:00:00');
const day2Base = new Date('2026-05-06T08:00:00');

function ts(base, minOffset) {
  const d = new Date(base.getTime() + minOffset*60000);
  return d.toISOString().replace('T',' ').slice(0,19);
}

function genOrders(shiftId, empId, base, count, startNum) {
  for(let i=0; i<count; i++) {
    oid++;
    const minOff = Math.floor(i * (480/count)) + Math.floor(Math.random()*10);
    const pm = payModes[Math.floor(Math.random()*3)];
    const st = statuses[Math.floor(Math.random()*10)];
    const ot = types[Math.floor(Math.random()*3)];
    const tbl = ot==='local' ? tables[Math.floor(Math.random()*10)] : null;
    const custId = Math.random()>0.6 ? Math.floor(Math.random()*5)+1 : null;
    const numItems = Math.floor(Math.random()*3)+1;
    let sub = 0;
    for(let j=0; j<numItems; j++) {
      const itIdx = Math.floor(Math.random()*20);
      const it = items[itIdx];
      const qty = Math.floor(Math.random()*2)+1;
      const up = it[1];
      const uc = it[2];
      sub += up*qty;
      const vl = itIdx<5 ? 'وسط' : null;
      const nt = Math.random()>0.8 ? 'بدون سكر' : null;
      oiRows.push(`(${oid},${itIdx+1},${qty},${up},${uc},${vl?`'${vl}'`:'NULL'},${nt?`'${nt}'`:'NULL'})`);
    }
    const hasDisc = Math.random()>0.8;
    const discAmt = hasDisc ? Math.floor(sub*0.1) : 0;
    const total = sub - discAmt;
    const bn = pm!=='cash' ? `'${banks[Math.floor(Math.random()*4)]}'` : 'NULL';
    const br = pm!=='cash' ? `'REF-${1000+oid}'` : 'NULL';
    const ci = pm==='cash' ? Math.ceil(total/500)*500 : 'NULL';
    const cc = pm==='cash' ? ci-total : 'NULL';
    const cp = pm==='split' ? Math.floor(total*0.6) : 'NULL';
    const bp = pm==='split' ? total-Math.floor(total*0.6) : 'NULL';
    orderRows.push(`('ord_${String(oid).padStart(3,'0')}',${startNum+i},${sub},${discAmt},${hasDisc?"'خصم 10%'":'NULL'},${hasDisc?"'pct'":'NULL'},${hasDisc?10:'NULL'},${total},'${pm}',${bn},${br},${ci},${cc},${cp},${bp},${custId||'NULL'},${empId},${shiftId},'${st}',${ot?`'${ot}'`:'NULL'},${tbl?`'${tbl}'`:'NULL'},'${ts(base,minOff)}')`);
  }
}

genOrders(1, 3, day1Base, 18, 1);
genOrders(2, 3, new Date('2026-05-05T16:00:00'), 14, 19);
genOrders(3, 4, day2Base, 18, 33);
genOrders(4, 3, new Date('2026-05-06T16:00:00'), 15, 51);

w(`INSERT INTO orders (client_order_id,order_num,subtotal,disc_amount,disc_reason,disc_type,disc_value,total,pay_mode,bank_name,bank_ref,cash_in,cash_change,cash_part,bank_part,customer_id,employee_id,shift_id,status,order_type,table_num,created_at) VALUES`);
w(orderRows.join(',\n')+';');
w(`INSERT INTO order_items (order_id,item_id,qty,unit_price,unit_cost,variation_label,note) VALUES`);
w(oiRows.join(',\n')+';');

// PETTY CASH
w(`INSERT INTO petty_cash (type,amount,reason,shift_id,employee_id,created_at) VALUES`);
w(`('out',5000,'شراء أكواب ورقية',1,1,'2026-05-05 09:30:00'),('out',2000,'صيانة ماكينة',1,1,'2026-05-05 14:00:00'),('in',10000,'إيداع نقدي',2,2,'2026-05-05 17:00:00'),('out',3500,'مناديل ومستلزمات',3,1,'2026-05-06 10:00:00'),('out',1500,'أجرة توصيل',3,1,'2026-05-06 12:30:00'),('out',4000,'شراء أغطية',2,3,'2026-05-05 19:00:00'),('in',15000,'تحويل من الحساب',3,2,'2026-05-06 08:30:00'),('out',2500,'صيانة طابعة',4,3,'2026-05-06 18:00:00');`);

// EXPENSES
w(`INSERT INTO expenses (amount,category,note,shift_id,employee_id,created_at) VALUES`);
w(`(15000,'مستلزمات','أكواب+أغطية+شفاطات',1,1,'2026-05-05 09:00:00'),(8000,'صيانة','إصلاح ثلاجة',1,1,'2026-05-05 13:00:00'),(3000,'نقل','توصيل بضاعة',2,2,'2026-05-05 18:00:00'),(25000,'إيجار','إيجار مايو',3,1,'2026-05-06 09:00:00'),(5000,'تسويق','طباعة منيو',3,1,'2026-05-06 11:00:00'),(2000,'مستلزمات','منظفات',3,2,'2026-05-06 14:00:00'),(6000,'صيانة','صيانة مكيف',4,3,'2026-05-06 17:00:00'),(1500,'نقل','سيارة توصيل',4,3,'2026-05-06 20:00:00'),(3500,'مستلزمات','أكياس تغليف',2,3,'2026-05-05 20:00:00'),(7000,'رواتب','سلفة موظف',3,1,'2026-05-06 12:00:00');`);

// STOCK ADJUSTMENTS
w(`INSERT INTO stock_adjustments (ingredient_id,quantity,type,reason,employee_id,location_id,created_at) VALUES`);
w(`(2,-2,'waste','حليب منتهي',1,'main','2026-05-05 08:30:00'),(15,-0.5,'damage','خس تالف',2,'kitchen','2026-05-05 10:00:00'),(1,5,'add','شحنة جديدة',1,'main','2026-05-05 11:00:00'),(13,-10,'remove','خبز قديم',2,'kitchen','2026-05-05 16:00:00'),(14,10,'add','بطاطس طازجة',1,'main','2026-05-06 08:00:00'),(8,-1,'waste','فراولة تالفة',1,'main','2026-05-06 09:00:00'),(6,-0.5,'correction','تصحيح جرد',1,'main','2026-05-06 15:00:00'),(11,-2,'sale','استهلاك مطبخ',5,'kitchen','2026-05-05 12:00:00'),(12,-1.5,'sale','استهلاك برجر',5,'kitchen','2026-05-05 14:00:00'),(3,-1,'waste','سكر مبلل',1,'main','2026-05-06 10:00:00'),(9,-3,'sale','عصير برتقال',5,'kitchen','2026-05-06 11:00:00'),(2,20,'add','استلام حليب',1,'main','2026-05-06 07:00:00');`);

// PURCHASES
w(`INSERT INTO purchases (supplier_id,total_cost,note,employee_id,created_at) VALUES (1,45000,'طلبية قهوة شهرية',1,'2026-05-04 10:00:00'),(3,22900,'حليب وجبن أسبوعي',2,'2026-05-05 07:00:00'),(2,18500,'خضار وفواكه',1,'2026-05-06 07:30:00'),(4,8200,'خبز ودقيق',2,'2026-05-06 08:00:00');`);
w(`INSERT INTO purchase_items (purchase_id,item_id,quantity,unit_cost,total_cost,created_at) VALUES (1,1,5,7500,37500,'2026-05-04 10:00:00'),(1,4,1.5,5000,7500,'2026-05-04 10:00:00'),(2,2,20,550,11000,'2026-05-05 07:00:00'),(2,6,2,3200,6400,'2026-05-05 07:00:00'),(2,7,1,5500,5500,'2026-05-05 07:00:00'),(3,9,10,750,7500,'2026-05-06 07:30:00'),(3,8,2,3800,7600,'2026-05-06 07:30:00'),(3,15,3,700,2100,'2026-05-06 07:30:00'),(3,14,3,450,1350,'2026-05-06 07:30:00'),(4,13,100,40,4000,'2026-05-06 08:00:00'),(4,5,15,280,4200,'2026-05-06 08:00:00');`);

// TRANSFERS
w(`INSERT INTO inventory_transfers (item_id,from_location,to_location,quantity,employee_id,note,created_at) VALUES`);
w(`(1,'main','kitchen',2,1,'تزويد قهوة','2026-05-05 08:00:00'),(2,'main','kitchen',5,2,'حليب صباحي','2026-05-05 08:00:00'),(11,'main','kitchen',3,1,'دجاج','2026-05-05 09:00:00'),(12,'main','kitchen',2,1,'لحم برجر','2026-05-05 09:00:00'),(13,'main','kitchen',30,2,'خبز','2026-05-06 07:30:00'),(14,'main','kitchen',5,1,'بطاطس','2026-05-06 08:00:00'),(1,'main','kitchen',3,1,'قهوة يوم2','2026-05-06 08:00:00'),(2,'main','kitchen',8,2,'حليب يوم2','2026-05-06 08:00:00'),(11,'main','kitchen',4,1,'دجاج يوم2','2026-05-06 09:00:00'),(12,'main','kitchen',3,1,'لحم يوم2','2026-05-06 09:00:00');`);

// CLOCK LOG
w(`INSERT INTO clock_log (employee_id,shift_id,type,created_at) VALUES`);
w(`(1,1,'in','2026-05-05 07:55:00'),(3,1,'in','2026-05-05 08:00:00'),(5,1,'in','2026-05-05 08:05:00'),(4,1,'in','2026-05-05 08:10:00'),`);
w(`(1,1,'out','2026-05-05 16:05:00'),(3,1,'out','2026-05-05 16:00:00'),(5,1,'out','2026-05-05 16:00:00'),(4,1,'out','2026-05-05 16:10:00'),`);
w(`(3,2,'in','2026-05-05 16:00:00'),(6,2,'in','2026-05-05 16:10:00'),(2,2,'in','2026-05-05 16:30:00'),`);
w(`(3,2,'out','2026-05-06 00:05:00'),(6,2,'out','2026-05-06 00:00:00'),(2,2,'out','2026-05-06 00:00:00'),`);
w(`(1,3,'in','2026-05-06 07:50:00'),(4,3,'in','2026-05-06 08:00:00'),(5,3,'in','2026-05-06 08:05:00'),(2,3,'in','2026-05-06 08:00:00'),`);
w(`(1,3,'out','2026-05-06 16:00:00'),(4,3,'out','2026-05-06 16:05:00'),(5,3,'out','2026-05-06 16:00:00'),(2,3,'out','2026-05-06 16:00:00'),`);
w(`(3,4,'in','2026-05-06 16:00:00'),(6,4,'in','2026-05-06 16:10:00'),(3,4,'out','2026-05-07 00:00:00'),(6,4,'out','2026-05-07 00:05:00');`);

// ACTION LOG
w(`INSERT INTO action_log (employee_id,action,detail,created_at) VALUES`);
w(`(1,'SESSION_LOGIN','{"employeeId":1}','2026-05-05 07:55:00'),(1,'SHIFT_OPEN','{"shiftId":1,"float":50000}','2026-05-05 08:00:00'),`);
w(`(3,'SESSION_LOGIN','{"employeeId":3}','2026-05-05 08:00:00'),(3,'ORDER_CREATE','{"orderId":1}','2026-05-05 08:15:00'),`);
w(`(3,'ORDER_CREATE','{"orderId":2}','2026-05-05 09:02:00'),(1,'EXPENSE_CREATE','{"amount":15000}','2026-05-05 09:00:00'),`);
w(`(1,'STOCK_ADJUST','{"type":"waste","qty":-2}','2026-05-05 08:30:00'),(3,'ORDER_VOID','{"orderId":4}','2026-05-05 11:00:00'),`);
w(`(1,'INVENTORY_TRANSFER','{"from":"main","to":"kitchen"}','2026-05-05 08:00:00'),(1,'SHIFT_CLOSE','{"shiftId":1}','2026-05-05 16:00:00'),`);
w(`(2,'SESSION_LOGIN','{"employeeId":2}','2026-05-05 17:00:00'),(3,'SHIFT_OPEN','{"shiftId":2}','2026-05-05 16:00:00'),`);
w(`(3,'SHIFT_CLOSE','{"shiftId":2}','2026-05-06 00:00:00'),(2,'SHIFT_OPEN','{"shiftId":3}','2026-05-06 08:00:00'),`);
w(`(1,'PURCHASE_CREATE','{"purchaseId":1}','2026-05-04 10:00:00'),(2,'PURCHASE_CREATE','{"purchaseId":2}','2026-05-05 07:00:00'),`);
w(`(1,'EMPLOYEE_UPDATE','{"employeeId":4}','2026-05-06 10:00:00'),(1,'SESSION_LOGOUT','{"employeeId":1}','2026-05-06 16:00:00'),`);
w(`(3,'SHIFT_OPEN','{"shiftId":4}','2026-05-06 16:00:00'),(4,'ORDER_CREATE','{"orderId":35}','2026-05-06 09:00:00'),`);
w(`(3,'SHIFT_CLOSE','{"shiftId":4}','2026-05-07 00:00:00'),(2,'SHIFT_CLOSE','{"shiftId":3}','2026-05-06 16:00:00');`);

// SETTINGS
w(`INSERT OR REPLACE INTO settings (key,value) VALUES ('restaurant_name','مومو للحلويات والقهوة'),('currency','SAR'),('tax_rate','15'),('schema_version','015');`);

fs.writeFileSync('src/main/db/migrations/015_seed_demo.sql', sql);
console.log(`Generated ${sql.split('\n').length} lines, ${oid} orders, ${oiRows.length} order items`);
