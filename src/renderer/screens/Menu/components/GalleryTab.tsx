import React, { useState, useEffect, useRef } from 'react'
import { P } from '../../../tokens'
import { Icon } from '../../../components/Icon'
import { Btn } from '../../../components/Btn'
import { Inp } from '../../../components/Inp'
import { Modal } from '../../../components/Modal'
import { MenuIcon } from '../../../components/MenuIcon'
import { toast } from '../../../components/Toast'

const api = (window as any).api

interface GalleryImage {
  id: number
  item_id: number
  image_path: string
  sort_order: number
  created_at: string
}

/**
 * Product Gallery tab — lives inside the Menu screen.
 * Shows all products with their gallery images as a visual timeline.
 * Users can:
 *   - Select a product to view its photo history
 *   - Upload new gallery photos (timestamped)
 *   - Set any gallery photo as the active product image
 *   - Delete gallery photos
 */
export function GalleryTab({ items, onReload }: { items: any[], onReload: () => void }) {
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<GalleryImage | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const filteredItems = search.trim()
    ? items.filter(i => i.name.includes(search.trim()))
    : items

  const loadGallery = async (itemId: number) => {
    setLoading(true)
    try {
      const g = await api?.menu?.getGallery?.(itemId)
      setGallery(Array.isArray(g) ? g : [])
    } catch { setGallery([]) }
    setLoading(false)
  }

  const selectItem = (item: any) => {
    setSelectedItem(item)
    setPreview(null)
    loadGallery(item.id)
  }

  const uploadPhoto = async (e: any) => {
    const files = Array.from(e.target.files || []) as File[]
    if (!files.length || !selectedItem) return
    setUploading(true)
    for (const file of files.slice(0, 5)) {
      try {
        const base64 = await readFileAsDataURL(file)
        await api?.menu?.addGalleryImage?.(selectedItem.id, base64)
      } catch { }
    }
    await loadGallery(selectedItem.id)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    toast('✓ تم رفع الصور')
  }

  const deletePhoto = async (img: GalleryImage) => {
    try {
      await api?.menu?.removeGalleryImage?.(img.id)
      setGallery(prev => prev.filter(g => g.id !== img.id))
      if (preview?.id === img.id) setPreview(null)
      toast('تم حذف الصورة')
    } catch { toast('خطأ في الحذف') }
  }

  const setAsMainImage = async (img: GalleryImage) => {
    if (!selectedItem) return
    try {
      // Extract raw filename from resolved file:// URL for DB storage
      const rawPath = img.image_path.includes('/') ? img.image_path.split('/').pop()! : img.image_path
      // Update the item's image_path and switch to image display mode
      await api?.menu?.updateItem?.(selectedItem.id, {
        imagePath: rawPath,
        displayMode: 'image'
      })
      toast('✓ تم تعيين كصورة رئيسية')
      onReload()
      // Refresh local selectedItem
      const updated = await api?.menu?.getItem?.(selectedItem.id)
      if (updated) setSelectedItem(updated)
    } catch { toast('خطأ في التحديث') }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'Z')
      return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    } catch { return dateStr }
  }

  return (
    <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden', minHeight: 0 }}>
      {/* Left: Product list */}
      <div style={{
        width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: P.surface, borderRadius: 16, border: `1px solid ${P.border}`,
        overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: P.plum, marginBottom: 8 }}>اختر منتجاً</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: P.bg2, borderRadius: 10, padding: '6px 10px' }}>
            <Icon name="search" size={13} color={P.faint} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث…"
              style={{ border: 'none', background: 'transparent', color: P.plum, fontSize: 13, outline: 'none', flex: 1, fontFamily: 'Cairo,sans-serif' }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {filteredItems.map(item => {
            const isActive = selectedItem?.id === item.id
            const hasGallery = (item.gallery || []).length > 0
            return (
              <button
                key={item.id}
                onClick={() => selectItem(item)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 12, marginBottom: 3,
                  border: `1.5px solid ${isActive ? P.purple : 'transparent'}`,
                  background: isActive ? P.purpleXL : 'transparent',
                  cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
                  transition: 'all .12s'
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 9, overflow: 'hidden', flexShrink: 0,
                  background: `linear-gradient(135deg,${P.bg3},${P.purpleXL})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {item.display_mode === 'image' && item.image_path
                    ? <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e: any) => { e.target.style.display = 'none' }} />
                    : <MenuIcon id={item.emoji} size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: isActive ? P.purple : P.plum,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: P.faint }}>
                    {item.price.toLocaleString()} ج.س
                    {hasGallery && <span style={{ marginRight: 6, color: P.green }}>📷 {item.gallery.length}</span>}
                  </div>
                </div>
              </button>
            )
          })}
          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: P.faint, fontSize: 13 }}>لا توجد نتائج</div>
          )}
        </div>
      </div>

      {/* Right: Gallery view */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: P.surface, borderRadius: 16, border: `1px solid ${P.border}`,
        overflow: 'hidden', minWidth: 0
      }}>
        {!selectedItem ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: P.faint }}>
            <div style={{ fontSize: 52, filter: 'grayscale(.4)' }}>🖼️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: P.muted }}>معرض صور المنتجات</div>
            <div style={{ fontSize: 13 }}>اختر منتجاً لعرض وإدارة صوره</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: '14px 18px', borderBottom: `1px solid ${P.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: `linear-gradient(135deg, ${P.purpleXL}, ${P.bg2})`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                  background: `linear-gradient(135deg,${P.bg3},${P.purpleXL})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${P.borderM}`
                }}>
                  {selectedItem.display_mode === 'image' && selectedItem.image_path
                    ? <img src={selectedItem.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <MenuIcon id={selectedItem.emoji} size={24} />}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: P.plum }}>{selectedItem.name}</div>
                  <div style={{ fontSize: 11, color: P.muted }}>
                    {gallery.length} صورة في المعرض · العرض: {selectedItem.display_mode === 'image' ? 'صورة' : 'أيقونة'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={uploadPhoto} style={{ display: 'none' }} />
                <Btn variant="primary" icon="upload" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'جارٍ الرفع...' : 'إضافة صور'}
                </Btn>
              </div>
            </div>

            {/* Gallery grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: P.faint }}>جارٍ التحميل...</div>
              ) : gallery.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: P.faint }}>
                  <div style={{ fontSize: 48, marginBottom: 12, filter: 'grayscale(.3)' }}>📸</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: P.muted, marginBottom: 6 }}>لا توجد صور بعد</div>
                  <div style={{ fontSize: 13, marginBottom: 16 }}>ارفع صوراً لتوثيق شكل المنتج عبر الوقت</div>
                  <Btn variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>رفع أول صورة</Btn>
                </div>
              ) : (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 14
                }}>
                  {gallery.map(img => {
                    const isMain = selectedItem.image_path === img.image_path
                    return (
                      <div key={img.id} style={{
                        borderRadius: 14, overflow: 'hidden',
                        border: `2px solid ${isMain ? P.green : P.border}`,
                        background: P.bg2, position: 'relative',
                        transition: 'all .15s',
                        boxShadow: isMain ? `0 0 0 2px ${P.greenL}` : 'none'
                      }}>
                        {/* Image */}
                        <div
                          onClick={() => setPreview(img)}
                          style={{
                            aspectRatio: '4/3', overflow: 'hidden', cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          <img
                            src={img.image_path}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                            onError={(e: any) => { e.target.style.display = 'none' }}
                          />
                          {/* Hover overlay */}
                          <div
                            className="gallery-hover-overlay"
                            style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(0,0,0,.4)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              opacity: 0, transition: 'opacity .15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '0' }}
                          >
                            <Icon name="search" size={28} color="#fff" />
                          </div>
                          {/* Main badge */}
                          {isMain && (
                            <div style={{
                              position: 'absolute', top: 8, right: 8,
                              padding: '3px 10px', borderRadius: 99,
                              fontSize: 10, fontWeight: 800,
                              background: P.green, color: '#fff',
                              boxShadow: '0 2px 8px rgba(4,120,87,.3)'
                            }}>الصورة الرئيسية</div>
                          )}
                        </div>

                        {/* Info + actions */}
                        <div style={{ padding: '8px 10px 10px' }}>
                          <div style={{ fontSize: 11, color: P.faint, marginBottom: 6 }}>
                            {formatDate(img.created_at)}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {!isMain && (
                              <button
                                onClick={() => setAsMainImage(img)}
                                style={{
                                  flex: 1, padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                  border: `1px solid ${P.greenL}`, background: P.greenXL, color: P.green,
                                  cursor: 'pointer', fontFamily: 'Cairo,sans-serif'
                                }}
                              >تعيين كرئيسية</button>
                            )}
                            <button
                              onClick={() => deletePhoto(img)}
                              style={{
                                padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                border: `1px solid ${P.roseL}`, background: P.roseXL, color: P.rose,
                                cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
                                minWidth: 28
                              }}
                            >
                              <Icon name="del" size={12} color={P.rose} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lightbox preview */}
      {preview && (
        <Modal title="معاينة الصورة" onClose={() => setPreview(null)} width={700} icon="search">
          <div style={{ textAlign: 'center' }}>
            <img
              src={preview.image_path}
              alt=""
              style={{
                maxWidth: '100%', maxHeight: '60vh', borderRadius: 14,
                objectFit: 'contain', border: `1.5px solid ${P.borderM}`
              }}
            />
            <div style={{ fontSize: 12, color: P.faint, marginTop: 10 }}>
              {formatDate(preview.created_at)}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              {selectedItem?.image_path !== preview.image_path && (
                <Btn variant="primary" icon="check" onClick={() => { setAsMainImage(preview); setPreview(null) }}>
                  تعيين كصورة رئيسية
                </Btn>
              )}
              <Btn variant="danger" icon="del" onClick={() => { deletePhoto(preview); setPreview(null) }}>
                حذف
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => resolve(ev.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
