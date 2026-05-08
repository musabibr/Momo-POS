import { getDb } from './connection'
import bcrypt from 'bcryptjs'

export function runSeed(): void {
  const db = getDb()

  const count = db.prepare('SELECT COUNT(*) as cnt FROM employees').get() as any
  if (count && count.cnt > 0) {
    console.log('[Seed] Data already exists, skipping seed')
    return
  }

  console.log('[Seed] First launch — inserting realistic seed data...')

  const seedTransaction = db.transaction(() => {
    // ════════════════════════════════════════════════════════════
    //  CATEGORIES
    // ════════════════════════════════════════════════════════════
    const cats = [
      { id: 'hot-drinks',    name: 'مشروبات ساخنة',     color: '#92400e', parent_id: null, sort_order: 0 },
      { id: 'cold-drinks',   name: 'مشروبات باردة',     color: '#0e7490', parent_id: null, sort_order: 1 },
      { id: 'desserts',      name: 'حلويات',             color: '#db2777', parent_id: null, sort_order: 2 },
      { id: 'pastry',        name: 'مخبوزات',           color: '#b45309', parent_id: null, sort_order: 3 },
      { id: 'ice-cream',     name: 'آيس كريم وميلك شيك', color: '#0891b2', parent_id: null, sort_order: 4 },
      
      { id: 'espresso',      name: 'إسبريسو',            color: '#78350f', parent_id: 'hot-drinks',  sort_order: 0 },
      { id: 'tea',           name: 'شاي وأعشاب',         color: '#166534', parent_id: 'hot-drinks',  sort_order: 1 },
      { id: 'iced-coffee',   name: 'قهوة مثلجة',         color: '#155e75', parent_id: 'cold-drinks', sort_order: 0 },
      { id: 'fresh-juice',   name: 'عصائر طازجة',        color: '#ea580c', parent_id: 'cold-drinks', sort_order: 1 },
      { id: 'smoothie',      name: 'سموذي',              color: '#be185d', parent_id: 'cold-drinks', sort_order: 2 },
      { id: 'cakes',         name: 'كيكات',              color: '#a21caf', parent_id: 'desserts',    sort_order: 0 },
      { id: 'oriental',      name: 'حلويات شرقية',       color: '#ca8a04', parent_id: 'desserts',    sort_order: 1 },
      { id: 'french',        name: 'حلويات فرنسية',      color: '#9333ea', parent_id: 'desserts',    sort_order: 2 },
    ]
    const catStmt = db.prepare(`INSERT INTO categories (id, name, color, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)`)
    for (const c of cats) catStmt.run(c.id, c.name, c.color, c.parent_id, c.sort_order)

    // ════════════════════════════════════════════════════════════
    //  OPTION GROUP TEMPLATES
    // ════════════════════════════════════════════════════════════
    const SIZE = { name: 'الحجم', type: 'single' as const, kind: 'variation' as const, options: [
      { name: 'صغير',  price_adj: 0 },
      { name: 'وسط',   price_adj: 2000 },
      { name: 'كبير',  price_adj: 4000 },
    ]}
    const MILK = { name: 'نوع الحليب', type: 'single' as const, kind: 'variation' as const, options: [
      { name: 'حليب كامل',   price_adj: 0 },
      { name: 'حليب خالي الدسم', price_adj: 0 },
      { name: 'حليب شوفان',  price_adj: 3000 },
      { name: 'حليب لوز',    price_adj: 3000 },
    ]}
    const SUGAR = { name: 'السكر', type: 'single' as const, kind: 'variation' as const, options: [
      { name: 'عادي',       price_adj: 0 },
      { name: 'نص سكر',    price_adj: 0 },
      { name: 'بدون سكر',  price_adj: 0 },
    ]}
    const TOPPING = { name: 'الإضافات', type: 'multi' as const, kind: 'modifier' as const, options: [
      { name: 'كريمة مخفوقة',   price_adj: 2000 },
      { name: 'صوص شوكولاتة',  price_adj: 1500 },
      { name: 'صوص كراميل',    price_adj: 1500 },
      { name: 'مكسرات مشكلة',  price_adj: 3000 },
      { name: 'شوت إسبريسو',   price_adj: 2500 },
    ]}
    const FLAVOR_ICE = { name: 'النكهة', type: 'single' as const, kind: 'variation' as const, options: [
      { name: 'فانيلا',       price_adj: 0 },
      { name: 'شوكولاتة',    price_adj: 0 },
      { name: 'فراولة',       price_adj: 0 },
      { name: 'مانجو',        price_adj: 0 },
      { name: 'فستق',         price_adj: 1500 },
    ]}
    const CRUST = { name: 'القاعدة', type: 'single' as const, kind: 'variation' as const, options: [
      { name: 'بسكويت ديجستيف', price_adj: 0 },
      { name: 'أوريو',          price_adj: 1000 },
      { name: 'لوتس',           price_adj: 1500 },
    ]}
    const SCOOP = { name: 'عدد الكرات', type: 'single' as const, kind: 'variation' as const, options: [
      { name: 'كرة واحدة', price_adj: 0 },
      { name: 'كرتين',     price_adj: 5000 },
      { name: '3 كرات',    price_adj: 10000 },
    ]}
    const TEA_TYPE = { name: 'نوع الشاي', type: 'single' as const, kind: 'variation' as const, options: [
      { name: 'شاي أحمر',    price_adj: 0 },
      { name: 'شاي أخضر',    price_adj: 0 },
      { name: 'كرك',          price_adj: 1500 },
      { name: 'ماتشا لاتيه',  price_adj: 3000 },
    ]}

    type OptGroup = { name: string; type: string; kind: string; options: { name: string; price_adj: number }[] }

    // ════════════════════════════════════════════════════════════
    //  ITEMS (Desserts & Drinks ONLY) - High Inflation SDG Prices
    // ════════════════════════════════════════════════════════════
    const items: { name: string; price: number; cost: number | null; cat_id: string; subcat: string | null; emoji: string; desc: string; groups: OptGroup[] }[] = [
      // ── Espresso-based ──
      { name: 'إسبريسو',           price: 15000, cost: 5000,  cat_id: 'espresso', subcat: 'espresso', emoji: '☕', desc: 'شوت إسبريسو مزدوج', groups: [SUGAR] },
      { name: 'أمريكانو',           price: 18000, cost: 5500,  cat_id: 'espresso', subcat: 'espresso', emoji: '☕', desc: '', groups: [SIZE, SUGAR] },
      { name: 'لاتيه',              price: 25000, cost: 8000,  cat_id: 'espresso', subcat: 'espresso', emoji: '☕', desc: '', groups: [SIZE, MILK, SUGAR, TOPPING] },
      { name: 'كابتشينو',           price: 25000, cost: 8000,  cat_id: 'espresso', subcat: 'espresso', emoji: '☕', desc: '', groups: [SIZE, MILK, SUGAR] },
      { name: 'فلات وايت',          price: 28000, cost: 9500,  cat_id: 'espresso', subcat: 'espresso', emoji: '☕', desc: 'إسبريسو مع حليب مخملي', groups: [SIZE, MILK] },
      { name: 'موكا',                price: 32000, cost: 11000, cat_id: 'espresso', subcat: 'espresso', emoji: '☕', desc: 'إسبريسو + شوكولاتة + حليب', groups: [SIZE, MILK, SUGAR, TOPPING] },
      { name: 'كورتادو',             price: 22000, cost: 7000,  cat_id: 'espresso', subcat: 'espresso', emoji: '☕', desc: 'إسبريسو مع قليل من الحليب', groups: [MILK, SUGAR] },
      { name: 'قهوة تركي',           price: 16000, cost: 5500,  cat_id: 'espresso', subcat: 'espresso', emoji: '☕', desc: 'قهوة تركية بالهيل', groups: [SUGAR] },

      // ── Tea & herbs ──
      { name: 'شاي',                 price: 10000, cost: 5000,  cat_id: 'tea', subcat: 'tea', emoji: '🍵', desc: '', groups: [TEA_TYPE, SUGAR] },
      { name: 'شاي بالنعناع',         price: 12000, cost: 5500,  cat_id: 'tea', subcat: 'tea', emoji: '🍵', desc: 'شاي أحمر مع نعناع طازج', groups: [SUGAR] },
      { name: 'شوكولاتة ساخنة',       price: 28000, cost: 10500, cat_id: 'hot-drinks', subcat: null, emoji: '🍫', desc: 'شوكولاتة بلجيكية بالحليب', groups: [SIZE, MILK, TOPPING] },
      { name: 'سحلب',                 price: 22000, cost: 8000,  cat_id: 'hot-drinks', subcat: null, emoji: '🥛', desc: 'سحلب مصري ساخن بالمكسرات', groups: [SIZE] },

      // ── Iced coffee ──
      { name: 'آيس لاتيه',           price: 28000, cost: 9000,  cat_id: 'iced-coffee', subcat: 'iced-coffee', emoji: '🧊', desc: '', groups: [SIZE, MILK, SUGAR, TOPPING] },
      { name: 'آيس أمريكانو',        price: 20000, cost: 6000,  cat_id: 'iced-coffee', subcat: 'iced-coffee', emoji: '🧊', desc: '', groups: [SIZE, SUGAR] },
      { name: 'آيس موكا',             price: 35000, cost: 11500, cat_id: 'iced-coffee', subcat: 'iced-coffee', emoji: '🧊', desc: '', groups: [SIZE, MILK, TOPPING] },
      { name: 'كولد برو',             price: 30000, cost: 8500,  cat_id: 'iced-coffee', subcat: 'iced-coffee', emoji: '🧊', desc: 'قهوة باردة مستخلصة 18 ساعة', groups: [SIZE, SUGAR] },
      { name: 'أفوقاتو',              price: 35000, cost: 12000, cat_id: 'iced-coffee', subcat: 'iced-coffee', emoji: '🍨', desc: 'آيس كريم فانيلا مع شوت إسبريسو', groups: [] },

      // ── Fresh juices ──
      { name: 'عصير مانجو',          price: 28000, cost: 10500, cat_id: 'fresh-juice', subcat: 'fresh-juice', emoji: '🥭', desc: 'مانجو طازج', groups: [SIZE] },
      { name: 'عصير فراولة',          price: 28000, cost: 10500, cat_id: 'fresh-juice', subcat: 'fresh-juice', emoji: '🍓', desc: 'فراولة طازجة', groups: [SIZE] },
      { name: 'عصير برتقال',          price: 24000, cost: 8000,  cat_id: 'fresh-juice', subcat: 'fresh-juice', emoji: '🍊', desc: 'برتقال طازج معصور', groups: [SIZE] },
      { name: 'ليمون بالنعناع',       price: 20000, cost: 6500,  cat_id: 'fresh-juice', subcat: 'fresh-juice', emoji: '🍋', desc: 'ليمون + نعناع + ثلج', groups: [SIZE, SUGAR] },
      { name: 'عصير جوافة',           price: 25000, cost: 8500,  cat_id: 'fresh-juice', subcat: 'fresh-juice', emoji: '🍈', desc: '', groups: [SIZE] },

      // ── Smoothies ──
      { name: 'سموذي أكاي بيري',     price: 45000, cost: 18000, cat_id: 'smoothie', subcat: 'smoothie', emoji: '🫐', desc: 'أكاي بيري + موز + توت', groups: [SIZE, TOPPING] },
      { name: 'سموذي مانجو باشن',    price: 40000, cost: 15000, cat_id: 'smoothie', subcat: 'smoothie', emoji: '🥭', desc: 'مانجو + باشن فروت + يوغرت', groups: [SIZE] },
      { name: 'سموذي بروتين',        price: 48000, cost: 19000, cat_id: 'smoothie', subcat: 'smoothie', emoji: '💪', desc: 'موز + زبدة فول سوداني + بروتين + حليب', groups: [SIZE, MILK] },

      // ── Cakes ──
      { name: 'تشيز كيك توت',        price: 50000, cost: 19500, cat_id: 'cakes', subcat: 'cakes', emoji: '🍰', desc: 'تشيز كيك نيويورك بالتوت', groups: [CRUST] },
      { name: 'تشيز كيك لوتس',       price: 50000, cost: 20000, cat_id: 'cakes', subcat: 'cakes', emoji: '🍪', desc: 'تشيز كيك باللوتس والكراميل', groups: [CRUST] },
      { name: 'ريد فيلفت سلايس',     price: 40000, cost: 15000, cat_id: 'cakes', subcat: 'cakes', emoji: '🎂', desc: 'قطعة كيك ريد فيلفت', groups: [] },
      { name: 'كيك شوكولاتة تربل',   price: 45000, cost: 16500, cat_id: 'cakes', subcat: 'cakes', emoji: '🍫', desc: '3 طبقات شوكولاتة', groups: [TOPPING] },
      { name: 'كيك كراميل مملح',      price: 45000, cost: 16500, cat_id: 'cakes', subcat: 'cakes', emoji: '🧁', desc: 'كيك بالكراميل والملح البحري', groups: [] },
      { name: 'تيراميسو',             price: 42000, cost: 15500, cat_id: 'cakes', subcat: 'cakes', emoji: '☕', desc: 'تيراميسو إيطالي كلاسيكي', groups: [] },

      // ── Oriental sweets ──
      { name: 'كنافة نابلسية',        price: 35000, cost: 12000, cat_id: 'oriental', subcat: 'oriental', emoji: '🧀', desc: 'كنافة بالجبن + قطر', groups: [] },
      { name: 'بسبوسة بالقشطة',       price: 25000, cost: 9000,  cat_id: 'oriental', subcat: 'oriental', emoji: '🍮', desc: '', groups: [] },
      { name: 'أم علي',               price: 30000, cost: 10500, cat_id: 'oriental', subcat: 'oriental', emoji: '🥧', desc: 'أم علي بالمكسرات والزبيب', groups: [] },
      { name: 'قطايف بالقشطة',        price: 32000, cost: 11000, cat_id: 'oriental', subcat: 'oriental', emoji: '🥟', desc: '', groups: [] },

      // ── French desserts ──
      { name: 'كريم بروليه',          price: 38000, cost: 13000, cat_id: 'french', subcat: 'french', emoji: '🍮', desc: 'كريم بروليه فرنسي', groups: [TOPPING] },
      { name: 'لافا كيك',             price: 42000, cost: 15000, cat_id: 'french', subcat: 'french', emoji: '🌋', desc: 'كيك شوكولاتة بقلب سائل', groups: [TOPPING] },
      { name: 'بان كوتا',             price: 35000, cost: 12000, cat_id: 'french', subcat: 'french', emoji: '🍨', desc: 'بان كوتا بصوص الكراميل', groups: [TOPPING] },
      { name: 'بروفيترول',             price: 38000, cost: 13500, cat_id: 'french', subcat: 'french', emoji: '🍩', desc: 'كرات شو بالشوكولاتة والكريمة', groups: [] },
      { name: 'ميل فوي',               price: 40000, cost: 14500, cat_id: 'french', subcat: 'french', emoji: '🥐', desc: 'طبقات باف باستري بالكاسترد', groups: [] },

      // ── Ice cream & milkshake ──
      { name: 'آيس كريم',             price: 22000, cost: 8000,  cat_id: 'ice-cream', subcat: null, emoji: '🍦', desc: '', groups: [FLAVOR_ICE, SCOOP, TOPPING] },
      { name: 'ميلك شيك أوريو',       price: 38000, cost: 13000, cat_id: 'ice-cream', subcat: null, emoji: '🥤', desc: '', groups: [SIZE, TOPPING] },
      { name: 'ميلك شيك نوتيلا',      price: 42000, cost: 14500, cat_id: 'ice-cream', subcat: null, emoji: '🥤', desc: '', groups: [SIZE, TOPPING] },
      { name: 'ميلك شيك لوتس',        price: 42000, cost: 14500, cat_id: 'ice-cream', subcat: null, emoji: '🥤', desc: '', groups: [SIZE, TOPPING] },
      { name: 'سندويشة آيس كريم',      price: 28000, cost: 9500,  cat_id: 'ice-cream', subcat: null, emoji: '🍦', desc: 'آيس كريم بين كوكيز', groups: [FLAVOR_ICE] },

      // ── Pastry ──
      { name: 'كرواسون سادة',         price: 15000, cost: 6000,  cat_id: 'pastry', subcat: null, emoji: '🥐', desc: '', groups: [] },
      { name: 'كرواسون شوكولاتة',     price: 22000, cost: 8000,  cat_id: 'pastry', subcat: null, emoji: '🥐', desc: '', groups: [] },
      { name: 'كرواسون زعتر وجبن',    price: 24000, cost: 8500,  cat_id: 'pastry', subcat: null, emoji: '🥐', desc: '', groups: [] },
      { name: 'دانيش تفاح',           price: 22000, cost: 7500,  cat_id: 'pastry', subcat: null, emoji: '🍎', desc: 'دانيش بالتفاح والقرفة', groups: [] },
      { name: 'مافن بلوبيري',          price: 20000, cost: 7000,  cat_id: 'pastry', subcat: null, emoji: '🧁', desc: '', groups: [] },
      { name: 'كوكيز شوكولاتة',       price: 15000, cost: 5000,  cat_id: 'pastry', subcat: null, emoji: '🍪', desc: 'كوكيز ناعم بقطع الشوكولاتة', groups: [] },
      { name: 'وافل بلجيكي',           price: 32000, cost: 11000, cat_id: 'pastry', subcat: null, emoji: '🧇', desc: '', groups: [TOPPING] },
    ]

    const itemStmt = db.prepare(`INSERT INTO items (name, description, price, cost, cat_id, subcat_id, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    const grpStmt  = db.prepare(`INSERT INTO item_option_groups (item_id, name, type, kind, sort_order) VALUES (?, ?, ?, ?, ?)`)
    const optStmt  = db.prepare(`INSERT INTO item_options (group_id, name, price_adj, sort_order) VALUES (?, ?, ?, ?)`)

    for (const item of items) {
      const result = itemStmt.run(item.name, item.desc || null, item.price, item.cost, item.cat_id, item.subcat, item.emoji)
      const itemId = result.lastInsertRowid
      for (let gi = 0; gi < item.groups.length; gi++) {
        const g = item.groups[gi]
        const gResult = grpStmt.run(itemId, g.name, g.type, g.kind, gi)
        const groupId = gResult.lastInsertRowid
        for (let oi = 0; oi < g.options.length; oi++) {
          optStmt.run(groupId, g.options[oi].name, g.options[oi].price_adj, oi)
        }
      }
    }

    // ════════════════════════════════════════════════════════════
    //  SETTINGS
    // ════════════════════════════════════════════════════════════
    const settingsStmt = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`)
    const defaultSettings: [string, string][] = [
      ['restaurant_name', 'مومو كافيه'],
      ['receipt_header', 'مومو كافيه\nحلويات · قهوة · مشروبات\n━━━━━━━━━━━━━━━━━'],
      ['receipt_footer', 'شكراً لزيارتكم ☕\nتابعونا @momo_cafe_sd\n━━━━━━━━━━━━━━━━━'],
      ['banks', JSON.stringify(['بنك الخرطوم', 'بنك فيصل الإسلامي', 'بنكك', 'بنك أمدرمان الوطني'])],
      ['loyalty_rate', '1000'],
      ['loyalty_redemption_value', '100'],
      ['cashier_max_discount_pct', '10'],
      ['manager_max_discount_pct', '50'],
      ['backup_schedule', 'hourly'],
      ['backup_usb_path', ''],
      ['app_version', '2.0.0'],
      ['currency', 'SDG'],
      ['schema_version', '009'],
      ['printer1_port', ''],
      ['printer2_port', ''],
      ['logo_path', ''],
      ['enforce_kitchen_stock', 'false'],
      ['cost_alert_threshold', '70'],
      ['shifts_required', 'true'],
      ['inactivity_lock_minutes', '10'],
    ]
    for (const [key, value] of defaultSettings) settingsStmt.run(key, value)

    // ════════════════════════════════════════════════════════════
    //  DEFAULT ADMIN (username: admin, pass: 1234, pin: 1234)
    // ════════════════════════════════════════════════════════════
    const pinHash = bcrypt.hashSync('1234', 10)
    db.prepare(`INSERT INTO employees (name, username, role, pin_hash, password_hash, permissions) VALUES (?, ?, ?, ?, ?, ?)`).run('المدير العام', 'admin', 'admin', pinHash, pinHash, '["*"]')
  })

  try {
    seedTransaction()
    console.log('[Seed] Seed data inserted successfully')
  } catch (err: any) {
    console.error('[Seed] Failed:', err.message)
    throw err
  }
}
