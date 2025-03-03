import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm';
import UserManagement from './components/admin/UserManagement';
import Dashboard from './components/Dashboard';
import InventoryList from './components/inventory/InventoryList';
import CustomerList from './components/customers/CustomerList';
import InvoiceList from './components/billing/InvoiceList';
import QuoteList from './components/billing/QuoteList';
import NCFSequenceList from './components/billing/NCFSequenceList';
import FinanceOverview from './components/finance/FinanceOverview';
import ComplianceOverview from './components/compliance/ComplianceOverview';
import PayablesList from './components/payables/PayablesList';
import ExpenseList from './components/payables/ExpenseList';
import ProfilePage from './components/profile/ProfilePage';
import Layout from './components/Layout';
import { useAuth } from './hooks/useAuth';
import RawMaterialList from './components/inventory/RawMaterialList';
import PurchaseList from './components/purchases/PurchaseList';
import SupplierList from './components/suppliers/SupplierList';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          !user ? <LoginForm /> : <Navigate to="/dashboard" replace />
        } />
        
        <Route path="/dashboard" element={
          user ? (
            <Layout>
              <Dashboard />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/profile" element={
          user ? (
            <Layout>
              <ProfilePage />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/usuarios" element={
          user ? (
            <Layout>
              <UserManagement />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        <Route path="/inventario" element={
          user ? (
            <Layout>
              <InventoryList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/materias-primas" element={
          user ? (
            <Layout>
              <RawMaterialList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/clientes" element={
          user ? (
            <Layout>
              <CustomerList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/facturacion" element={
          user ? (
            <Layout>
              <InvoiceList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/facturacion/cotizaciones" element={
          user ? (
            <Layout>
              <QuoteList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/facturacion/secuencias" element={
          user ? (
            <Layout>
              <NCFSequenceList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/finanzas" element={
          user ? (
            <Layout>
              <FinanceOverview />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/cuentas-por-pagar" element={
          user ? (
            <Layout>
              <PayablesList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/gastos" element={
          user ? (
            <Layout>
              <ExpenseList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/cumplimiento" element={
          user ? (
            <Layout>
              <ComplianceOverview />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/compras" element={
          user ? (
            <Layout>
              <PurchaseList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route path="/suplidores" element={
          user ? (
            <Layout>
              <SupplierList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        <Route path="/" element={
          <Navigate to={user ? "/dashboard" : "/login"} replace />
        } />
      </Routes>
    </Router>
  );
}