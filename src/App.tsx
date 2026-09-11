/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Auth from './pages/Auth'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { TaxProvider } from './contexts/TaxContext'
import DemoDashboard from './pages/demo/DemoDashboard'
import MarkupPage from './pages/demo/MarkupPage'
import PurchasesPage from './pages/demo/PurchasesPage'
import OperatingExpensesPage from './pages/demo/OperatingExpensesPage'
import DrePresumidoPage from './pages/demo/DrePresumidoPage'
import DreRealPage from './pages/demo/DreRealPage'
import DreSimplesPage from './pages/demo/DreSimplesPage'
import ComparisonPage from './pages/demo/ComparisonPage'
import ReformaPage from './pages/demo/ReformaPage'
import ClientsPage from './pages/demo/ClientsPage'
import { Navigate } from 'react-router-dom'

// ONLY IMPORT AND RENDER WORKING PAGES, NEVER ADD PLACEHOLDER COMPONENTS OR PAGES IN THIS FILE
// AVOID REMOVING ANY CONTEXT PROVIDERS FROM THIS FILE (e.g. TooltipProvider, Toaster, Sonner)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TaxProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES MUST BE ADDED HERE */}
            </Route>
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={<Navigate to="/demo" replace />} />
            <Route
              path="/demo"
              element={
                <ProtectedRoute>
                  <DemoDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/markup"
              element={
                <ProtectedRoute>
                  <MarkupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/compras"
              element={
                <ProtectedRoute>
                  <PurchasesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/despesas-operacionais"
              element={
                <ProtectedRoute>
                  <OperatingExpensesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/dre-presumido"
              element={
                <ProtectedRoute>
                  <DrePresumidoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/simples"
              element={
                <ProtectedRoute>
                  <DreSimplesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/dre-real"
              element={
                <ProtectedRoute>
                  <DreRealPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/comparacao"
              element={
                <ProtectedRoute>
                  <ComparisonPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/reforma"
              element={
                <ProtectedRoute>
                  <ReformaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo/clientes"
              element={
                <ProtectedRoute>
                  <ClientsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </TaxProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
