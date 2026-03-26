import { Link, useLocation, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useState } from 'react';
import { analizarComprobante, imageToBase64 } from '../lib/anthropic';
import { pdfToImage } from '../lib/pdf';
import CameraMenu from './CameraMenu';
import ConfirmacionComprobante from './ConfirmacionComprobante';
import './Layout.css';

export default function Layout() {
  const location = useLocation();
  const { currentUser, logout } = useApp();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [datosConfirmacion, setDatosConfirmacion] = useState<any>(null);
  const [menuCamaraActivo, setMenuCamaraActivo] = useState(false);

  function isActive(path: string) {
    return location.pathname === path;
  }

  function handleCameraClick() {
    setMenuAbierto(!menuAbierto);
  }

  async function handleFileSelect(file: File) {
    setProcesandoImagen(true);

    try {
      let base64: string;
      let mimeType: string;

      if (file.type === 'application/pdf') {
        const result = await pdfToImage(file);
        base64 = result.base64;
        mimeType = result.mimeType;
      } else if (file.type.startsWith('image/')) {
        const result = await imageToBase64(file);
        base64 = result.base64;
        mimeType = result.mimeType;
      } else {
        alert('Tipo de archivo no soportado. Usá una imagen o PDF.');
        return;
      }

      const datos = await analizarComprobante(base64, mimeType);
      setDatosConfirmacion(datos);
    } catch (error) {
      console.error('Error al procesar archivo:', error);
      alert('No se pudo analizar el comprobante. Intentá de nuevo.');
    } finally {
      setProcesandoImagen(false);
    }
  }

  function handleCloseConfirmacion() {
    setDatosConfirmacion(null);
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="header-title">Casa Franco</Link>
          {currentUser && (
            <div className="header-user">
              <Link to="/config" className="user-avatar-link">
                {currentUser.foto_url ? (
                  <img src={currentUser.foto_url} alt={currentUser.nombre} className="user-avatar-img" />
                ) : (
                  <div className="user-avatar-placeholder">
                    {currentUser.nombre.charAt(0)}
                  </div>
                )}
              </Link>
              <button onClick={logout} className="logout-btn">
                Salir
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="mobile-nav">
        <Link
          to="/"
          className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Tablero</span>
        </Link>

        <Link
          to="/fijos"
          className={`mobile-nav-item ${isActive('/fijos') ? 'active' : ''}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Fijos</span>
        </Link>

        <Link
          to="/caja"
          className={`mobile-nav-item ${isActive('/caja') ? 'active' : ''}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
          <span>Caja</span>
        </Link>

        <Link
          to="/gastos"
          className={`mobile-nav-item ${isActive('/gastos') ? 'active' : ''}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 18V6" />
          </svg>
          <span>Gastos</span>
        </Link>
      </nav>

      <Link to="/registrar" className="fab">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>

      <button
        onClick={handleCameraClick}
        className="fab-camera"
        disabled={procesandoImagen}
        title="Escanear comprobante"
      >
        {procesandoImagen ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinning">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        )}
      </button>

      <CameraMenu
        isOpen={menuAbierto}
        onClose={() => setMenuAbierto(false)}
        onFileSelect={handleFileSelect}
        onMenuStateChange={setMenuCamaraActivo}
      />

      {datosConfirmacion && (
        <ConfirmacionComprobante
          data={datosConfirmacion}
          onClose={handleCloseConfirmacion}
        />
      )}

      <Link to="/asesor" className={`fab-ia ${menuCamaraActivo ? 'hidden' : ''}`}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
          <path d="M12 6v4M12 14v4"/>
          <circle cx="8" cy="10" r="1" fill="currentColor"/>
          <circle cx="16" cy="10" r="1" fill="currentColor"/>
          <path d="M8 16c1 1 2.5 1.5 4 1.5s3-.5 4-1.5"/>
        </svg>
        <span className="fab-ia-label">IA Franquito</span>
      </Link>
    </div>
  );
}
