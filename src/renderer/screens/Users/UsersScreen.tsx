import React, { useState, useEffect } from 'react'
import { P } from '../../tokens'
import { Icon } from '../../components/Icon'
import { Inp, Field } from '../../components/Inp'
import { Btn } from '../../components/Btn'
import { Modal } from '../../components/Modal'
import { toast } from '../../components/Toast'

const api = (window as any).api

const ROLES = [
  { id: 'admin', label: 'مسؤول (Admin)' },
  { id: 'manager', label: 'مدير (Manager)' },
  { id: 'cashier', label: 'كاشير (Cashier)' },
  { id: 'kitchen', label: 'مطبخ (Kitchen)' },
]

const PERMISSIONS = [
  { id: '*', label: 'الوصول الكامل (Superadmin)', desc: 'يمنح جميع الصلاحيات في النظام دون استثناء' },
  { id: 'pos_access', label: 'الوصول لنقطة البيع', desc: 'إنشاء طلبات جديدة في الـ POS' },
  { id: 'pos_void', label: 'إلغاء الطلبات', desc: 'صلاحية إلغاء طلب مدفوع واسترجاع المبلغ' },
  { id: 'pos_discount', label: 'تطبيق الخصومات', desc: 'إضافة خصم على الفاتورة' },
  { id: 'shift_manage', label: 'إدارة الورديات', desc: 'فتح وإغلاق الوردية وتسوية النقد' },
  { id: 'transactions_view', label: 'سجل المعاملات', desc: 'رؤية جميع المعاملات السابقة' },
  { id: 'kitchen_view', label: 'شاشة المطبخ', desc: 'إدارة الطلبات من شاشة المطبخ' },
  { id: 'menu_manage', label: 'إدارة القائمة', desc: 'تعديل الأصناف والأسعار' },
  { id: 'inventory_manage', label: 'إدارة المخزون', desc: 'تعديل الكميات وجرد المخزون' },
  { id: 'purchase_manage', label: 'إدارة المشتريات', desc: 'إنشاء أوامر الشراء والموردين' },
  { id: 'customers_manage', label: 'إدارة العملاء', desc: 'رؤية قاعدة بيانات العملاء' },
  { id: 'reports_view', label: 'التقارير', desc: 'الوصول إلى لوحة المبيعات والتقارير المالية' },
  { id: 'users_manage', label: 'إدارة الموظفين', desc: 'إضافة أو تعديل المستخدمين والصلاحيات' },
  { id: 'settings_manage', label: 'إعدادات النظام', desc: 'تغيير إعدادات الطابعات والنسخ الاحتياطي' },
]

export function UsersScreen() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Form State
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('cashier')
  const [password, setPassword] = useState('')
  const [secQuestion, setSecQuestion] = useState('')
  const [secAnswer, setSecAnswer] = useState('')
  const [active, setActive] = useState(true)
  const [permissions, setPermissions] = useState<string[]>(['pos_access'])

  // Password reset state for admins
  const [resetId, setResetId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await api?.employees?.list?.()
      if (data) setUsers(data)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (u: any) => {
    // Need full data for edit (including permissions which is in ADMIN_COLS)
    const full = await api?.employees?.get?.(u.id)
    if (!full) return
    setEditingId(full.id)
    setName(full.name)
    setUsername(full.username || '')
    setRole(full.role)
    setPassword('') // Don't load password
    setSecQuestion(full.security_question || '')
    setSecAnswer('')
    setActive(full.active === 1)
    
    let perms = []
    try { perms = JSON.parse(full.permissions || '[]') } catch {}
    setPermissions(perms)
  }

  const handleCreateNew = () => {
    setEditingId(-1)
    setName('')
    setUsername('')
    setRole('cashier')
    setPassword('')
    setSecQuestion('')
    setSecAnswer('')
    setActive(true)
    setPermissions(['pos_access'])
  }

  const handleSave = async () => {
    if (!name || !username) {
      toast('الاسم واسم المستخدم مطلوبان')
      return
    }
    
    if (editingId === -1 && !password) {
      toast('كلمة المرور مطلوبة للمستخدم الجديد')
      return
    }

    const payload: any = {
      name, username, role, active, permissions,
      securityQuestion: secQuestion || null,
      securityAnswer: secAnswer || null
    }
    if (password) payload.password = password // Only send if updating

    try {
      if (editingId === -1) {
        await api?.employees?.create?.(payload)
        toast('تم إضافة المستخدم بنجاح')
      } else {
        await api?.employees?.update?.(editingId, payload)
        toast('تم تحديث المستخدم')
      }
      setEditingId(null)
      load()
    } catch (err: any) {
      toast(err.message || 'حدث خطأ')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return
    try {
      await api?.employees?.delete?.(id)
      toast('تم الحذف')
      load()
    } catch (e: any) {
      toast(e.message || 'خطأ في الحذف')
    }
  }

  const handleUnlock = async (id: number) => {
    try {
      await api?.employees?.unlock?.(id)
      toast('تم فك القفل')
      load()
    } catch (e: any) {
      toast('خطأ')
    }
  }

  const handleAdminPasswordReset = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast('كلمة المرور يجب أن تكون 4 خانات على الأقل')
      return
    }
    try {
      await api?.employees?.update?.(resetId, { password: newPassword })
      toast('تم تعيين كلمة مرور جديدة بنجاح')
      setResetId(null)
      setNewPassword('')
    } catch (e: any) {
      toast('حدث خطأ')
    }
  }

  const togglePermission = (perm: string) => {
    if (perm === '*') {
      if (permissions.includes('*')) setPermissions([])
      else setPermissions(['*'])
      return
    }
    
    if (permissions.includes('*')) return // * overrides all
    
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter(p => p !== perm))
    } else {
      setPermissions([...permissions, perm])
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: P.plum, margin: '0 0 8px 0' }}>إدارة المستخدمين</h1>
          <div style={{ color: P.muted, fontSize: 15 }}>إدارة الموظفين، كلمات المرور، وصلاحيات النظام</div>
        </div>
        <Btn onClick={handleCreateNew} icon="plus">مستخدم جديد</Btn>
      </div>

      <div style={{ background: P.surface, borderRadius: 16, border: `1px solid ${P.border}`, flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${P.border}`, background: P.bg2, color: P.muted, fontSize: 13, fontWeight: 700 }}>
              <th style={{ padding: '16px 20px' }}>الموظف</th>
              <th style={{ padding: '16px 20px' }}>اسم المستخدم</th>
              <th style={{ padding: '16px 20px' }}>الدور (الوظيفي)</th>
              <th style={{ padding: '16px 20px' }}>الحالة</th>
              <th style={{ padding: '16px 20px' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: P.muted }}>جاري التحميل...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: P.muted }}>لا يوجد مستخدمين</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${P.border}`, transition: 'background .2s', background: u.active ? 'transparent' : P.bg3 }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: P.plum }}>{u.name}</td>
                  <td style={{ padding: '16px 20px', color: P.ink }}>
                    <span style={{ background: P.bg, padding: '4px 8px', borderRadius: 6, border: `1px solid ${P.border}`, fontFamily: 'monospace' }}>
                      @{u.username || 'بدون'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ background: `${P.purple}15`, color: P.purple, padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                      {ROLES.find(r => r.id === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {u.locked_until && new Date(u.locked_until).getTime() > Date.now() ? (
                      <span style={{ color: P.rose, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="lock" size={14} /> حساب مقفل
                      </span>
                    ) : u.active ? (
                      <span style={{ color: P.green, fontWeight: 700, fontSize: 13 }}>نشط</span>
                    ) : (
                      <span style={{ color: P.muted, fontWeight: 700, fontSize: 13 }}>موقوف</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn variant="secondary" onClick={() => handleEdit(u)}>تعديل</Btn>
                      <div title="إعادة تعيين كلمة المرور"><Btn variant="secondary" onClick={() => setResetId(u.id)}><Icon name="lock" size={16} /></Btn></div>
                      {u.locked_until && new Date(u.locked_until).getTime() > Date.now() && (
                        <Btn onClick={() => handleUnlock(u.id)}>فك القفل</Btn>
                      )}
                      <Btn variant="danger" onClick={() => handleDelete(u.id)}><Icon name="trash" size={16} /></Btn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingId !== null && (
        <Modal title={editingId === -1 ? 'مستخدم جديد' : 'تعديل مستخدم'} width={800} onClose={() => setEditingId(null)}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            
            {/* Right column: Basic info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: P.plum, margin: '0 0 8px' }}>البيانات الأساسية</h3>
              
              <Field label="الاسم الكامل">
                <Inp value={name} onChange={e => setName(e.target.value)} placeholder="مثال: أحمد محمد" />
              </Field>
              
              <Field label="اسم المستخدم (للدخول)">
                <Inp value={username} onChange={e => setUsername(e.target.value)} placeholder="ahmed123" dir="ltr" style={{ textAlign: 'left' }} />
              </Field>
              
              <Field label="كلمة المرور">
                <Inp value={password} type="password" onChange={e => setPassword(e.target.value)} placeholder={editingId === -1 ? 'إجباري' : 'اتركه فارغاً لعدم التغيير'} dir="ltr" style={{ textAlign: 'left' }} />
              </Field>

              <Field label="المسمى الوظيفي">
                <select value={role} onChange={(e: any) => setRole(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 10, background: P.bg, border: `1px solid ${P.border}`, color: P.plum, fontSize: 15, padding: '0 12px', outline: 'none', fontFamily: 'Tajawal, sans-serif' }}>
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <div style={{ fontSize: 12, color: P.muted, marginTop: 4 }}>المسمى الوظيفي لا يؤثر على الصلاحيات، استخدم الجدول لتحديد الصلاحيات الفردية.</div>
              </Field>

              <div style={{ height: 1, background: P.border, margin: '8px 0' }} />
              
              <h3 style={{ fontSize: 14, fontWeight: 800, color: P.plum, margin: '0' }}>سؤال الأمان للاسترجاع (اختياري)</h3>
              <Field label="السؤال">
                <Inp value={secQuestion} onChange={e => setSecQuestion(e.target.value)} placeholder="مثال: ما هو اسم حيوانك الأليف؟" />
              </Field>
              <Field label="الإجابة">
                <Inp value={secAnswer} onChange={e => setSecAnswer(e.target.value)} placeholder={editingId === -1 ? 'أدخل إجابة' : 'اتركه فارغاً لعدم التغيير'} />
              </Field>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}>
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} style={{ width: 18, height: 18, accentColor: P.purple }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: P.plum }}>الحساب نشط (يمكنه الدخول)</span>
              </label>
            </div>

            {/* Left column: Permissions */}
            <div style={{ flex: 1.2, background: P.bg2, borderRadius: 12, padding: 20, border: `1px solid ${P.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: P.plum, margin: 0 }}>الصلاحيات المخصصة</h3>
                <span style={{ fontSize: 12, fontWeight: 700, color: P.purple, background: `${P.purple}20`, padding: '4px 10px', borderRadius: 99 }}>
                  {permissions.includes('*') ? 'وصول كامل' : `${permissions.length} صلاحية محددة`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
                {PERMISSIONS.map(p => {
                  const isChecked = permissions.includes(p.id) || (permissions.includes('*') && p.id !== '*')
                  const disabled = permissions.includes('*') && p.id !== '*'
                  return (
                    <label key={p.id} style={{ 
                      display: 'flex', alignItems: 'flex-start', gap: 12, cursor: disabled ? 'default' : 'pointer',
                      padding: 12, borderRadius: 10, background: isChecked ? P.surface : 'transparent',
                      border: `1px solid ${isChecked ? P.purple : P.border}`, opacity: disabled ? 0.6 : 1,
                      transition: 'all .2s'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => togglePermission(p.id)}
                        disabled={disabled}
                        style={{ width: 18, height: 18, accentColor: P.purple, marginTop: 2 }} 
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: isChecked ? P.purple : P.plum }}>{p.label}</div>
                        <div style={{ fontSize: 12, color: P.muted, marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingTop: 24, borderTop: `1px solid ${P.border}` }}>
            <div style={{ flex: 1, display: 'flex' }}><Btn fullWidth onClick={handleSave}>حفظ المستخدم</Btn></div>
            <Btn variant="secondary" onClick={() => setEditingId(null)}>إلغاء</Btn>
          </div>
        </Modal>
      )}

      {resetId !== null && (
        <Modal title="فرض إعادة تعيين كلمة المرور (للمسؤولين)" width={400} icon="lock" onClose={() => setResetId(null)}>
          <Field label="كلمة المرور الجديدة">
            <Inp value={newPassword} type="password" onChange={e => setNewPassword(e.target.value)} autoFocus placeholder="4 خانات على الأقل" />
          </Field>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <div style={{ flex: 1, display: 'flex' }}><Btn fullWidth onClick={handleAdminPasswordReset}>تأكيد وتغيير</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
