import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ConfirmacionComprobante.css';

interface ComprobanteData {
  monto: number;
  fecha: string;
  descripcion: string;
  medio_pago: string;
}

interface ConfirmacionComprobanteProps {
  data: ComprobanteData;
  onClose: () => void;
}

export default function ConfirmacionComprobante({ data, onClose }: ConfirmacionComprobanteProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(data);

  function handleConfirm() {
    navigate('/registrar', {
      state: {
        precompletado: {
          monto: formData.monto,
          fecha: formData.fecha,
          descripcion: formData.descripcion,
          medioPago: formData.medio_pago
        }
      }
    });
    onClose();
  }

  return (
    <>
      <div className="confirmacion-overlay" onClick={onClose} />
      <div className="confirmacion-card">
        <div className="confirmacion-header">
          <h3>Confirmar datos del comprobante</h3>
          <button className="confirmacion-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="confirmacion-body">
          <div className="confirmacion-field">
            <label>Monto</label>
            <input
              type="number"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
              step="0.01"
            />
          </div>

          <div className="confirmacion-field">
            <label>Fecha</label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            />
          </div>

          <div className="confirmacion-field">
            <label>Descripción</label>
            <input
              type="text"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </div>

          <div className="confirmacion-field">
            <label>Medio de pago</label>
            <select
              value={formData.medio_pago}
              onChange={(e) => setFormData({ ...formData, medio_pago: e.target.value })}
            >
              <option value="efectivo">Efectivo</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="confirmacion-footer">
          <button className="confirmacion-btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="confirmacion-btn-confirm" onClick={handleConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </>
  );
}
