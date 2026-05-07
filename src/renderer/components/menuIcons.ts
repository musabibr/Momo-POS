/**
 * Menu Item Icon Library — Multicolor inline SVGs, fully offline.
 * Each icon has: id, Arabic label, category, and SVG inner content (viewBox 0 0 24 24).
 */

export interface MIcon { id: string; label: string; cat: string; svg: string }

export const ICON_CATS = [
  { id: 'hot', label: '☕ مشروبات ساخنة' },
  { id: 'cold', label: '🧊 مشروبات باردة' },
  { id: 'juice', label: '🍊 عصائر' },
  { id: 'cake', label: '🍰 كيك وحلويات' },
  { id: 'oriental', label: '🧁 حلويات شرقية' },
  { id: 'ice', label: '🍦 آيس كريم' },
  { id: 'pastry', label: '🥐 معجنات' },
  { id: 'meal', label: '🍽 وجبات' },
  { id: 'other', label: '📦 أخرى' },
]

// Helper: shorthand for building multi-element SVGs
const c = (fill: string, d: string) => `<path fill="${fill}" d="${d}"/>`
const r = (fill: string, x: number, y: number, w: number, h: number, rx = 0) =>
  `<rect fill="${fill}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`
const ci = (fill: string, cx: number, cy: number, r: number) =>
  `<circle fill="${fill}" cx="${cx}" cy="${cy}" r="${r}"/>`

export const MENU_ICONS: MIcon[] = [
  // ── HOT DRINKS ─────────────────────────────────────
  { id: 'espresso', label: 'إسبريسو', cat: 'hot',
    svg: r('#795548',5,10,10,9,2)+r('#4E342E',6,11,8,4,1)+c('#795548','M15 13h2a2 2 0 010 4h-2')+c('#BDBDBD','M8 10Q8 7 10 6')+c('#BDBDBD','M11 10Q11 6 13 5') },
  { id: 'coffee-latte', label: 'لاتيه', cat: 'hot',
    svg: r('#8D6E63',5,8,10,12,2)+r('#D7CCC8',6,9,8,4,1)+r('#6D4C41',6,13,8,6,1)+c('#8D6E63','M15 12h2.5a2.5 2.5 0 010 5H15')+c('#BCAAA4','M8 8Q9 5 12 5Q14 5 14 8') },
  { id: 'cappuccino', label: 'كابتشينو', cat: 'hot',
    svg: r('#6D4C41',5,9,10,10,2)+r('#EFEBE9',6,10,8,3,1)+r('#5D4037',6,13,8,5,1)+c('#6D4C41','M15 12h2a2 2 0 010 4h-2')+ci('#D7CCC8',10,11,1.5) },
  { id: 'mocha', label: 'موكا', cat: 'hot',
    svg: r('#4E342E',5,9,10,10,2)+r('#8D6E63',6,10,8,3,1)+r('#3E2723',6,13,8,5,1)+c('#4E342E','M15 12h2a2 2 0 010 4h-2')+ci('#FFCC80',10,11,1.2) },
  { id: 'turkish-coffee', label: 'قهوة تركي', cat: 'hot',
    svg: c('#795548','M7 10h6v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-8z')+r('#5D4037',8,11,4,3,1)+c('#795548','M13 13h2a1.5 1.5 0 010 3h-2')+r('#FDD835',7,8,6,2,1) },
  { id: 'tea', label: 'شاي', cat: 'hot',
    svg: r('#FF8F00',5,9,10,10,2)+r('#FFB300',6,10,8,4,1)+r('#E65100',6,14,8,4,1)+c('#FF8F00','M15 12h2a2 2 0 010 4h-2')+c('#FFCC80','M8 9Q9 6 12 6') },
  { id: 'tea-mint', label: 'شاي بالنعناع', cat: 'hot',
    svg: r('#FF8F00',5,9,10,10,2)+r('#FFB300',6,10,8,8,1)+c('#FF8F00','M15 12h2a2 2 0 010 4h-2')+c('#4CAF50','M9 7Q10 4 11 6Q12 4 13 7')+c('#66BB6A','M10 8Q11 5 12 8') },
  { id: 'hot-choco', label: 'شوكولاتة ساخنة', cat: 'hot',
    svg: r('#5D4037',5,9,10,10,2)+r('#3E2723',6,10,8,8,1)+c('#5D4037','M15 12h2a2 2 0 010 4h-2')+ci('#EFEBE9',10,12,2)+c('#D7CCC8','M8 9Q9 6 12 5') },
  { id: 'sahlab', label: 'سحلب', cat: 'hot',
    svg: r('#EFEBE9',5,9,10,10,2)+r('#FFF8E1',6,10,8,8,1)+c('#EFEBE9','M15 12h2a2 2 0 010 4h-2')+ci('#8D6E63',8,14,0.8)+ci('#8D6E63',11,13,0.8)+ci('#66BB6A',10,15,0.6) },

  // ── COLD DRINKS ────────────────────────────────────
  { id: 'iced-coffee', label: 'آيس كوفي', cat: 'cold',
    svg: c('#90CAF9','M7 4h10l-1 16H8L7 4z')+r('#6D4C41',8,8,8,6,1)+c('#B3E5FC','M9 5h6v3H9z')+r('#BDBDBD',9,2,6,2,1) },
  { id: 'cold-brew', label: 'كولد برو', cat: 'cold',
    svg: r('#455A64',7,3,10,17,2)+r('#3E2723',8,8,8,11,1)+r('#78909C',8,4,8,4,1)+r('#BDBDBD',9,2,6,2,1) },
  { id: 'frappe', label: 'فرابيه', cat: 'cold',
    svg: c('#FFCC80','M7 5h10l-1.5 14a2 2 0 01-2 0H10.5a2 2 0 01-2 0L7 5z')+r('#6D4C41',8,9,8,5,1)+ci('#EFEBE9',12,7,2)+r('#E0E0E0',10,2,4,3,2) },
  { id: 'milkshake', label: 'ميلك شيك', cat: 'cold',
    svg: c('#F48FB1','M8 6h8l-1 13a2 2 0 01-2 1h-2a2 2 0 01-2-1L8 6z')+ci('#FCE4EC',12,9,2.5)+r('#E91E63',10,3,4,3,2)+r('#BDBDBD',11,1,2,3,1) },
  { id: 'smoothie', label: 'سموذي', cat: 'cold',
    svg: c('#CE93D8','M8 5h8l-1 14a1.5 1.5 0 01-1.5 1h-3A1.5 1.5 0 019 19L8 5z')+c('#AB47BC','M9 10h6v4H9z')+r('#E0E0E0',10,2,4,3,2)+ci('#4CAF50',11,8,1) },
  { id: 'soda', label: 'مشروب غازي', cat: 'cold',
    svg: r('#F44336',7,5,10,14,3)+r('#D32F2F',8,6,8,12,2)+r('#BDBDBD',9,3,6,3,1)+r('#FFCDD2',9,9,6,2,1) },

  // ── JUICES ─────────────────────────────────────────
  { id: 'juice-orange', label: 'عصير برتقال', cat: 'juice',
    svg: r('#FF9800',6,6,12,13,3)+r('#FFB74D',7,7,10,11,2)+r('#BDBDBD',9,3,6,4,1)+ci('#FFF176',12,13,2) },
  { id: 'juice-mango', label: 'عصير مانجو', cat: 'juice',
    svg: r('#FFC107',6,6,12,13,3)+r('#FFD54F',7,7,10,11,2)+r('#BDBDBD',9,3,6,4,1)+ci('#FF8F00',12,13,2) },
  { id: 'juice-strawberry', label: 'عصير فراولة', cat: 'juice',
    svg: r('#E91E63',6,6,12,13,3)+r('#F06292',7,7,10,11,2)+r('#BDBDBD',9,3,6,4,1)+ci('#FCE4EC',12,13,2) },
  { id: 'juice-lemon', label: 'ليمون بالنعناع', cat: 'juice',
    svg: r('#CDDC39',6,6,12,13,3)+r('#E6EE9C',7,7,10,11,2)+r('#BDBDBD',9,3,6,4,1)+ci('#4CAF50',11,12,1.5)+ci('#4CAF50',13,14,1) },
  { id: 'juice-guava', label: 'عصير جوافة', cat: 'juice',
    svg: r('#FFAB91',6,6,12,13,3)+r('#FFCCBC',7,7,10,11,2)+r('#BDBDBD',9,3,6,4,1)+ci('#FF5722',12,13,2) },
  { id: 'juice-mix', label: 'عصير مشكل', cat: 'juice',
    svg: r('#7B1FA2',6,6,12,13,3)+r('#CE93D8',7,7,10,11,2)+r('#BDBDBD',9,3,6,4,1)+ci('#FF9800',11,12,1.5)+ci('#E91E63',13,14,1) },

  // ── CAKES ──────────────────────────────────────────
  { id: 'cake-slice', label: 'كيك', cat: 'cake',
    svg: c('#FFCCBC','M4 20h16l-4-14H8L4 20z')+r('#F48FB1',5,16,14,4,1)+r('#FFAB91',7,10,10,6,0)+ci('#F44336',12,8,1.5) },
  { id: 'cheesecake', label: 'تشيز كيك', cat: 'cake',
    svg: c('#FFF9C4','M4 20h16l-2-10H6L4 20z')+r('#FFE082',5,16,14,4,1)+r('#FFF176',7,12,10,4,0)+ci('#E91E63',10,14,1)+ci('#E91E63',14,14,1)+r('#8D6E63',5,19,14,2,1) },
  { id: 'cupcake', label: 'كب كيك', cat: 'cake',
    svg: c('#F48FB1','M8 12h8l1 8H7l1-8z')+c('#CE93D8','M8 12Q8 7 12 6Q16 7 16 12')+ci('#FF5722',12,6,1.5)+r('#FFE082',9,14,6,2,1) },
  { id: 'red-velvet', label: 'ريد فيلفت', cat: 'cake',
    svg: c('#E53935','M4 20h16l-4-12H8L4 20z')+r('#FFCDD2',6,14,12,2,0)+r('#C62828',5,16,14,4,1)+ci('#EFEBE9',12,10,2) },
  { id: 'tiramisu', label: 'تيراميسو', cat: 'cake',
    svg: r('#8D6E63',5,8,14,11,2)+r('#EFEBE9',6,9,12,3,1)+r('#6D4C41',6,12,12,3,0)+r('#D7CCC8',6,15,12,3,1)+c('#5D4037','M8 8V6h2v2M14 8V6h2v2') },
  { id: 'chocolate-cake', label: 'كيك شوكولاتة', cat: 'cake',
    svg: c('#4E342E','M4 20h16l-3-12H7L4 20z')+r('#6D4C41',5,15,14,5,1)+r('#3E2723',7,10,10,5,0)+c('#8D6E63','M8 10Q12 7 16 10') },

  // ── ORIENTAL ───────────────────────────────────────
  { id: 'kunafa', label: 'كنافة', cat: 'oriental',
    svg: r('#FF8F00',4,10,16,9,2)+r('#FFC107',5,11,14,7,1)+r('#FFECB3',7,13,10,3,1)+c('#FF6F00','M5 10Q12 6 19 10') },
  { id: 'basbusa', label: 'بسبوسة', cat: 'oriental',
    svg: r('#FFB74D',4,10,16,9,2)+r('#FFE0B2',5,11,14,7,1)+ci('#EFEBE9',8,14,1.5)+ci('#EFEBE9',14,14,1.5)+ci('#8D6E63',11,14,0.8) },
  { id: 'umm-ali', label: 'أم علي', cat: 'oriental',
    svg: c('#8D6E63','M3 12Q3 18 12 20Q21 18 21 12L19 10H5L3 12z')+r('#EFEBE9',6,12,12,4,1)+ci('#795548',9,14,1)+ci('#795548',13,14,1)+ci('#FFC107',11,13,0.8) },
  { id: 'qatayef', label: 'قطايف', cat: 'oriental',
    svg: c('#FFB74D','M6 16Q6 10 12 8Q18 10 18 16z')+c('#FFE0B2','M8 15Q8 12 12 10Q16 12 16 15z')+ci('#EFEBE9',12,14,1.5) },
  { id: 'luqaimat', label: 'لقيمات', cat: 'oriental',
    svg: ci('#FF8F00',8,10,3)+ci('#FFB300',14,10,3)+ci('#FF8F00',11,15,3)+ci('#FFC107',9,11,1)+ci('#FFC107',13,11,1)+ci('#FFC107',12,14,1) },

  // ── ICE CREAM ──────────────────────────────────────
  { id: 'ice-cream-cone', label: 'آيس كريم', cat: 'ice',
    svg: c('#FFE082','M8 12h8l-3 9h-2l-3-9z')+ci('#F48FB1',10,10,3)+ci('#81D4FA',14,10,3)+ci('#CE93D8',12,8,3) },
  { id: 'ice-cream-cup', label: 'كوب آيس كريم', cat: 'ice',
    svg: r('#BDBDBD',5,12,14,7,2)+ci('#81D4FA',8,10,2.5)+ci('#F48FB1',13,10,2.5)+ci('#A5D6A7',10.5,8,2.5)+r('#E0E0E0',6,16,12,2,1) },
  { id: 'sundae', label: 'سنداي', cat: 'ice',
    svg: c('#E0E0E0','M8 13h8v5a2 2 0 01-2 2h-4a2 2 0 01-2-2v-5z')+ci('#FCE4EC',10,11,2.5)+ci('#FFCC80',14,11,2.5)+ci('#F44336',12,9,1.5)+r('#8D6E63',10,20,4,2,1) },
  { id: 'popsicle', label: 'مثلجات', cat: 'ice',
    svg: r('#E91E63',9,3,6,12,3)+r('#F48FB1',10,4,4,5,2)+r('#D7CCC8',11,15,2,5,1) },

  // ── PASTRY ─────────────────────────────────────────
  { id: 'croissant', label: 'كرواسون', cat: 'pastry',
    svg: c('#FFB74D','M4 14Q4 10 8 8Q12 6 16 8Q20 10 20 14Q18 16 12 16Q6 16 4 14z')+c('#FF8F00','M6 13Q8 10 12 9Q16 10 18 13Q16 14 12 14Q8 14 6 13z') },
  { id: 'donut', label: 'دونات', cat: 'pastry',
    svg: c('#F48FB1','M12 4a8 8 0 100 16 8 8 0 000-16z')+ci('#FFF9C4',12,12,3)+c('#E91E63','M7 9Q9 6 12 5Q15 6 17 9')+ci('#FF5722',9,8,0.8)+ci('#2196F3',14,8,0.8)+ci('#FFC107',11,7,0.8) },
  { id: 'cookie', label: 'كوكيز', cat: 'pastry',
    svg: ci('#FFB74D',12,12,7)+ci('#FF8F00',12,12,6)+ci('#5D4037',9,10,1.2)+ci('#5D4037',14,10,1.2)+ci('#5D4037',11,14,1.2)+ci('#5D4037',15,14,1) },
  { id: 'muffin', label: 'مافن', cat: 'pastry',
    svg: r('#FFE082',7,13,10,6,2)+c('#8D6E63','M7 13Q7 8 12 6Q17 8 17 13')+ci('#5D4037',10,10,1)+ci('#5D4037',14,10,1) },
  { id: 'waffle', label: 'وافل', cat: 'pastry',
    svg: r('#FFB74D',4,7,16,12,2)+r('#FF8F00',5,8,6,4,1)+r('#FF8F00',13,8,6,4,1)+r('#FF8F00',5,14,6,4,1)+r('#FF8F00',13,14,6,4,1)+ci('#FFC107',12,6,1.5) },
  { id: 'pancake', label: 'بان كيك', cat: 'pastry',
    svg: c('#FFB74D','M4 16Q4 14 12 13Q20 14 20 16Q20 18 12 19Q4 18 4 16z')+c('#FFCC80','M5 13Q5 11 12 10Q19 11 19 13Q19 15 12 16Q5 15 5 13z')+ci('#FFC107',12,9,2) },

  // ── MEALS ──────────────────────────────────────────
  { id: 'sandwich', label: 'ساندويش', cat: 'meal',
    svg: c('#FFB74D','M4 10Q4 8 12 6Q20 8 20 10z')+r('#66BB6A',5,10,14,2,0)+r('#FF7043',5,12,14,2,0)+r('#FFC107',5,14,14,2,0)+c('#FFCC80','M4 16Q4 18 12 20Q20 18 20 16z') },
  { id: 'burger', label: 'برجر', cat: 'meal',
    svg: c('#8D6E63','M4 10Q4 7 12 5Q20 7 20 10z')+r('#66BB6A',5,10,14,1.5,0)+r('#FFC107',5,11.5,14,1.5,0)+r('#D32F2F',5,13,14,2.5,0)+c('#FFAB91','M4 16Q4 18 12 19Q20 18 20 16z') },
  { id: 'pizza', label: 'بيتزا', cat: 'meal',
    svg: c('#FFC107','M12 3L3 20h18L12 3z')+c('#FF5722','M12 5L5 19h14L12 5z')+ci('#FFEB3B',10,13,1.5)+ci('#FFEB3B',14,15,1.5)+ci('#66BB6A',12,10,1)+ci('#D32F2F',11,16,1) },
  { id: 'wrap', label: 'راب', cat: 'meal',
    svg: c('#FFE0B2','M6 5L18 5L20 19H4L6 5z')+c('#FFCC80','M7 6L17 6L19 18H5L7 6z')+r('#66BB6A',9,8,6,2,1)+r('#FF7043',9,11,6,2,1)+r('#FFC107',9,14,6,2,1) },
  { id: 'salad', label: 'سلطة', cat: 'meal',
    svg: c('#E0E0E0','M3 14Q3 20 12 21Q21 20 21 14L19 12H5L3 14z')+ci('#66BB6A',9,14,3)+ci('#81C784',14,14,2.5)+ci('#FF5722',11,13,1.2)+ci('#FFC107',13,16,1) },
  { id: 'pasta', label: 'باستا', cat: 'meal',
    svg: c('#E0E0E0','M3 14Q3 19 12 20Q21 19 21 14L19 12H5L3 14z')+c('#FFC107','M7 14Q9 10 12 12Q15 10 17 14')+c('#FFB74D','M8 15Q10 11 12 13Q14 11 16 15')+ci('#D32F2F',12,12,2) },
  { id: 'rice-bowl', label: 'أرز', cat: 'meal',
    svg: c('#FF7043','M3 12Q3 19 12 20Q21 19 21 12L19 10H5L3 12z')+c('#EFEBE9','M5 11Q5 10 12 9Q19 10 19 11Q19 13 12 14Q5 13 5 11z') },
  { id: 'soup', label: 'شوربة', cat: 'meal',
    svg: c('#FF8F00','M3 12Q3 19 12 20Q21 19 21 12L19 10H5L3 12z')+c('#FFB74D','M5 12Q5 11 12 10Q19 11 19 12Q19 14 12 15Q5 14 5 12z')+c('#BDBDBD','M8 10Q9 7 10 9')+c('#BDBDBD','M12 10Q13 6 14 9') },

  // ── OTHER ──────────────────────────────────────────
  { id: 'water', label: 'ماء', cat: 'other',
    svg: r('#90CAF9',7,4,10,16,3)+r('#42A5F5',8,8,8,11,2)+r('#BBDEFB',9,5,6,3,1)+r('#BDBDBD',9,2,6,3,1) },
  { id: 'plate', label: 'طبق', cat: 'other',
    svg: c('#E0E0E0','M2 15Q2 19 12 20Q22 19 22 15L20 13H4L2 15z')+c('#EEEEEE','M4 14Q4 13 12 12Q20 13 20 14Q20 16 12 17Q4 16 4 14z') },
  { id: 'takeaway', label: 'أكواب ورقية', cat: 'other',
    svg: c('#EFEBE9','M7 4h10l-1.5 16H8.5L7 4z')+r('#4CAF50',7,4,10,5,0)+r('#EFEBE9',9,2,6,3,1)+c('#388E3C','M7 7h10') },
  { id: 'bread', label: 'خبز', cat: 'other',
    svg: c('#FFCC80','M4 14Q4 10 8 8Q12 6 16 8Q20 10 20 14Q20 17 12 18Q4 17 4 14z')+c('#FFB74D','M6 13Q8 10 12 9Q16 10 18 13')+c('#FF8F00','M9 12L11 11M13 12L15 11') },
  { id: 'nuts', label: 'مكسرات', cat: 'other',
    svg: ci('#8D6E63',8,10,3)+ci('#A1887F',15,11,2.5)+ci('#6D4C41',11,15,2.8)+ci('#795548',8,10,2)+ci('#795548',15,11,1.5)+ci('#5D4037',11,15,1.8) },
  { id: 'fruit', label: 'فواكه', cat: 'other',
    svg: ci('#F44336',8,12,3.5)+ci('#FFC107',15,13,3)+ci('#4CAF50',10,8,1.5)+c('#388E3C','M8 8Q9 6 11 7')+c('#F57F17','M15 10Q14 8 13 9') },
  { id: 'candy', label: 'حلوى', cat: 'other',
    svg: r('#E91E63',7,8,10,10,5)+r('#F48FB1',8,9,8,8,4)+c('#FCE4EC','M7 10L5 6M17 10L19 6M7 16L5 20M17 16L19 20') },
  { id: 'gift-box', label: 'هدية', cat: 'other',
    svg: r('#E91E63',4,10,16,10,2)+r('#C2185B',4,10,16,3,0)+r('#FFC107',11,10,2,10,0)+r('#FFC107',4,11,16,2,0)+c('#FFD54F','M12 10Q10 6 8 8Q10 10 12 10Q14 6 16 8Q14 10 12 10') },
]

/** Look up icon by ID — returns undefined if not found (means it's a raw emoji) */
export function getMenuIcon(id: string | null | undefined): MIcon | undefined {
  if (!id) return undefined
  return MENU_ICONS.find(i => i.id === id)
}
