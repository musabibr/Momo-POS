import { useState, useEffect, useCallback } from 'react'
import { P, Screen, navForRole } from './tokens'
import { Sidebar } from './layout/Sidebar'
import { MobileNav } from './layout/MobileNav'
import { ToastHost } from './components/Toast'
import { POSScreen } from './screens/POS/POSScreen'
import { MenuScreen } from './screens/Menu/MenuScreen'
import { InventoryScreen } from './screens/Inventory/InventoryScreen'
import { ProcurementScreen } from './screens/Procurement/ProcurementScreen'
import { CustomersScreen } from './screens/Customers/CustomersScreen'
import { CashScreen } from './screens/Cash/CashScreen'
import { ReportsScreen } from './screens/Reports/ReportsScreen'
import { SettingsScreen } from './screens/Settings/SettingsScreen'
import { SetupWizard } from './screens/Setup/SetupWizard'
import { KitchenConsole } from './screens/Kitchen/KitchenConsole'
import { TransactionsScreen } from './screens/Transactions/TransactionsScreen'
import { LoginScreen } from './screens/Login/LoginScreen'
import { UsersScreen } from './screens/Users/UsersScreen'
import { SessionProvider, useSession } from './hooks/useSession'
import { useInactivityLock } from './hooks/useInactivityLock'
import { useViewport } from './ds/useViewport'
import { isKitchenOnly } from '@shared/permissions'
import { NAV } from './tokens'
import { Icon } from './components/Icon'
import { Btn } from './components/Btn'

function AppInner() {
  const { session, loading, login, logout, canDomain } = useSession()
  const [active, setActive] = useState<Screen>('pos')
  const [firstRun, setFirstRun] = useState<boolean | null>(null)
  const viewport = useViewport()
  const collapsed = viewport.isNarrow      // mdDown — sidebar to icons
  const mobileNav = viewport.bp === 'sm'   // smDown — bottom nav, sidebar hidden

  const handleLock = useCallback(() => { logout() }, [logout])

  // Inactivity lock — only when logged in
  useInactivityLock(handleLock, !!session)

  useEffect(() => {
    // Check if setup wizard is needed (atomic check on main process side)
    const api = (window as any).api
    api?.system?.isSetupRequired?.().then((needed: boolean) => {
      setFirstRun(!!needed)
    }).catch(() => setFirstRun(true)) // on error, show wizard (safe side)
  }, [])

  // Reset to the first allowed screen whenever permissions change or the active
  // screen becomes disallowed (e.g. direct navigation to an ungranted screen).
  useEffect(() => {
    if (session) {
      const allowed = navForRole(session.permissions)
      if (allowed.length > 0 && !allowed.find(n => n.id === active)) {
        setActive(allowed[0].id)
      }
    }
  }, [session?.permissions, active])

  function renderScreen() {
    if (!session) return null
    // Per-screen permission guard, derived from NAV so it can't drift from the sidebar.
    // Uses domain access so a user with only a sub-permission still reaches the screen.
    const slot = NAV.find(n => n.id === active)
    if (slot && !canDomain(slot.perm)) return null
    switch (active) {
      case 'pos':         return <POSScreen />
      case 'transactions':return <TransactionsScreen />
      case 'shift':       return <CashScreen />
      case 'catalog':     return <MenuScreen />
      case 'stock':       return <InventoryScreen />
      case 'cust':        return <CustomersScreen />
      case 'procurement': return <ProcurementScreen />
      case 'insights':    return <ReportsScreen />
      case 'setup':       return <SettingsScreen />
      case 'users':       return <UsersScreen />
      case 'kitchen':     return <KitchenConsole />
    }
  }

  // Loading state — use matching background to prevent white flash
  if (firstRun === null || loading) {
    return (
      <div className="app-fadein" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: `linear-gradient(135deg, #1a0a2e 0%, #2d1657 40%, #1a0a2e 100%)` }}>
        <div style={{ fontSize: 24, color: '#fff', fontWeight: 900, fontFamily: 'Cairo,sans-serif', opacity: 0.8 }}>Momo</div>
      </div>
    )
  }

  // First-run wizard
  if (firstRun) return <><SetupWizard onComplete={() => setFirstRun(false)} /><ToastHost /></>

  // Login gate — no session means show login
  if (!session) return <div className="app-fadein"><LoginScreen onLogin={login} /><ToastHost /></div>

  // Kitchen-only user (permission is exactly kitchen_view) — fullscreen KDS, no sidebar.
  if (isKitchenOnly(session.permissions)) {
    return (
      <div className="app-fadein" style={{ height: '100vh', direction: 'rtl', fontFamily: 'Cairo, sans-serif', background: P.bg }}>
        <KitchenConsole onLogout={logout} />
        <ToastHost />
      </div>
    )
  }

  // No permissions at all — show a friendly locked panel rather than an empty shell.
  if (navForRole(session.permissions).length === 0) {
    return (
      <div className="app-fadein" style={{ height: '100vh', direction: 'rtl', fontFamily: 'Cairo, sans-serif', background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 380, padding: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `${P.rose}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Icon name="lock" size={28} color={P.rose} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: P.plum, margin: '0 0 8px' }}>لا توجد صلاحيات</h2>
          <div style={{ color: P.muted, fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
            حسابك لا يملك أي صلاحية للوصول إلى شاشات النظام. يرجى التواصل مع المسؤول.
          </div>
          <Btn variant="secondary" onClick={logout}>تسجيل الخروج</Btn>
        </div>
        <ToastHost />
      </div>
    )
  }

  return (
    <div className="app-fadein" style={{ display: 'flex', height: '100vh', direction: 'rtl', fontFamily: 'Cairo, sans-serif', background: P.bg }}>
      <Sidebar active={active} onChange={setActive} collapsed={collapsed} role={session.role} permissions={session.permissions} employee={session.employee} onLogout={logout} />
      <main
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          // Reserve space for bottom MobileNav so the last row of content isn't hidden.
          paddingBottom: mobileNav ? 56 : 0,
        }}
      >
        <div key={active} className="screen-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {renderScreen()}
        </div>
      </main>
      {mobileNav && <MobileNav active={active} onChange={setActive} permissions={session.permissions} />}
      <ToastHost />
    </div>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <AppInner />
    </SessionProvider>
  )
}
