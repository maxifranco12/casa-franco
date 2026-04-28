import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GastosFijos from './pages/GastosFijos';
import Caja from './pages/Caja';
import GastosVariables from './pages/GastosVariables';
import RegistrarMovimiento from './pages/RegistrarMovimiento';
import Configuracion from './pages/Configuracion';
import AsesorIA from './pages/AsesorIA';
import Informe from './pages/Informe';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="fijos" element={<GastosFijos />} />
        <Route path="caja" element={<Caja />} />
        <Route path="gastos" element={<GastosVariables />} />
        <Route path="registrar" element={<RegistrarMovimiento />} />
        <Route path="asesor" element={<AsesorIA />} />
        <Route path="informe" element={<Informe />} />
        <Route path="config" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
