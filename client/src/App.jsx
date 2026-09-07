import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import BillingPOS from './pages/BillingPOS';
import Invoices from './pages/Invoices';
import Khata from './pages/Khata';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AgentChat from './pages/AgentChat';

function AppLayout({ children }) {
  const { user } = useAuth();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('nebula_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('nebula_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle sidebar on Ctrl+B or Cmd+B when not typing inside an input/textarea
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          toggleCollapse();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Poll/fetch low stock alerts for sidebar badge
    const fetchBadge = () => {
      axios.get('/api/reports/dashboard')
        .then(res => {
          if (res.data?.lowStock?.count !== undefined) {
            setLowStockCount(res.data.lowStock.count);
          }
        })
        .catch(() => {});
    };

    fetchBadge();
    const interval = setInterval(fetchBadge, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FFFAED] text-[#292929]">
      <Sidebar
        lowStockCount={lowStockCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Pass toggle function to children via React.cloneElement */}
        {React.cloneElement(children, {
          onToggleSidebar: () => {
            if (window.innerWidth >= 1024) {
              toggleCollapse();
            } else {
              setSidebarOpen(prev => !prev);
            }
          },
          isSidebarCollapsed: isCollapsed
        })}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/pos"
              element={
                <AppLayout>
                  <BillingPOS />
                </AppLayout>
              }
            />
            <Route
              path="/agent"
              element={
                <AppLayout>
                  <AgentChat />
                </AppLayout>
              }
            />
            <Route
              path="/inventory"
              element={
                <AppLayout>
                  <Inventory />
                </AppLayout>
              }
            />
            <Route
              path="/invoices"
              element={
                <AppLayout>
                  <Invoices />
                </AppLayout>
              }
            />
            <Route
              path="/khata"
              element={
                <AppLayout>
                  <Khata />
                </AppLayout>
              }
            />
            <Route
              path="/reports"
              element={
                <AppLayout>
                  <Reports />
                </AppLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <AppLayout>
                  <Settings />
                </AppLayout>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
