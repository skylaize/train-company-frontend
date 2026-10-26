import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isDesktopApp } from "./desktop";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import RequireToken from "./components/RequireToken";

// 2.2 : le panneau d'administration n'est téléchargé que par ceux qui l'ouvrent
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* 2.4 : dans l'application Windows, pas de vitrine : le tableau de bord
                (ou la connexion, pour qui n'a pas encore de session) */}
            <Route path="/" element={isDesktopApp() ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireToken>
                  <Dashboard />
                </RequireToken>
              }
            />
            <Route
              path="/admin/*"
              element={
                <RequireToken>
                  <Suspense fallback={<div className="min-h-screen bg-navy-950" />}>
                    <AdminPage />
                  </Suspense>
                </RequireToken>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
