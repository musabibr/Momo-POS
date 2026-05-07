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

function AppInner() {
  const { session, loading, login, logout } = useSession()
  const [active, setActive] = useState<Screen>('pos')
  const [firstRun, setFirstRun] = useState<boolean | null>(null)
  const viewport = useViewport()
  const collapsed = viewport.isNarrow      // mdDown — sidebar to icons
  const mobileNav = viewport.bp === 'sm'   // smDown — bottom nav, sidebar hidden

  const handleLock = useCallback(() => { logout() }, [logout])

  // Inactivity lock — only when logged in
  useInactivityLock(handleLock, !!session)

  useEffect(() => {
    // Check if this is a first run (no employees exist)
    const api = (window as any).api
    api?.employees?.list?.().then((emps: any[]) => {
      setFirstRun(!emps || emps.length === 0)
    }).catch(() => setFirstRun(false))
  }, [])

  // Reset to default screen for the role when session changes
  useEffect(() => {
    if (session) {
      const allowed = navForRole(session.role, session.permissions)
      if (allowed.length > 0 && !allowed.find((n: any) => n.id === active)) {
        setActive(allowed[0].id)
      }
    }
  }, [session?.role, session?.permissions])

  function renderScreen() {
    if (!session) return null
    switch (active) {
      case 'pos':         return <POSScreen />
      case 'transactions':return <TransactionsScreen role={session.role} employeeId={session.employee?.id} />
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

  // Loading state
  if (firstRun === null || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: P.bg }}>
        <div style={{ fontSize: 24, color: P.purple, fontWeight: 900, fontFamily: 'Tajawal,sans-serif' }}>موموـ POS</div>
      </div>
    )
  }

  // First-run wizard
  if (firstRun) return <><SetupWizard onComplete={() => setFirstRun(false)} /><ToastHost /></>

  // Login gate — no session means show login
  if (!session) return <><LoginScreen onLogin={login} /><ToastHost /></>

  // Kitchen role — fullscreen, no sidebar
  if (session.role === 'kitchen') {
    return (
      <div style={{ height: '100vh', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: P.bg }}>
        <KitchenConsole />
        <ToastHost />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', direction: 'rtl', fontFamily: 'Tajawal, sans-serif', background: P.bg }}>
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
        {renderScreen()}
      </main>
      {mobileNav && <MobileNav active={active} onChange={setActive} />}
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
