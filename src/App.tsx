import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm';
import UserManagement from './components/admin/UserManagement';
import InventoryList from './components/inventory/InventoryList';
import CustomerList from './components/customers/CustomerList';
import InvoiceList from './components/billing/InvoiceList';
import Layout from './components/Layout';
import { useAuth } from './hooks/useAuth';

function App() {
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
        
        <Route path="/" element={
          <Navigate to={user ? "/dashboard" : "/login"} replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;