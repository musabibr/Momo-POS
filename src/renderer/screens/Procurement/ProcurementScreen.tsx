import React, { useState } from 'react'
import { P } from '../../tokens'
import { ScrollableTabs } from '../../components/layouts'
import { PurchaseOrdersTab } from '../Inventory/PurchaseOrdersTab'
import { PurchaseHistoryTab } from '../Inventory/PurchaseHistoryTab'
import { SuppliersTab } from '../Inventory/SuppliersTab'

/**
 * ProcurementScreen — Purchases & Suppliers.
 * 3 tabs: Purchase Orders | Purchase History | Suppliers
 */
export function ProcurementScreen() {
  const [tab, setTab] = useState('po')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 14px', gap: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: P.plum }}>المشتريات</div>
      <ScrollableTabs tabs={[
        { id: 'po', label: 'طلبات الشراء' },
        { id: 'history', label: 'سجل المشتريات' },
        { id: 'suppliers', label: 'الموردون' },
      ]} active={tab} onChange={setTab} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'po' && <PurchaseOrdersTab />}
        {tab === 'history' && <PurchaseHistoryTab />}
        {tab === 'suppliers' && <SuppliersTab />}
      </div>
    </div>
  )
}
