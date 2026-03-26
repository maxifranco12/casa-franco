import { useEffect, useState } from 'react';
import './Toast.css';

export interface ToastData {
  id: string;
  tipo: 'INGRESO' | 'EGRESO';
  usuario: string;
  monto: number;
  descripcion: string;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(monto);
  };

  return (
    <div className={`toast toast-${toast.tipo.toLowerCase()} ${isVisible ? 'toast-visible' : ''}`}>
      <div className="toast-header">
        <span className="toast-icon">{toast.tipo === 'INGRESO' ? '💰' : '💸'}</span>
        <span className="toast-tipo">{toast.tipo}</span>
      </div>
      <div className="toast-body">
        <strong>{toast.usuario}</strong> registró {formatMonto(toast.monto)}
        <div className="toast-descripcion">{toast.descripcion}</div>
      </div>
    </div>
  );
}
