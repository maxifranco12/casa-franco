import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { MEDIOS_PAGO, CATEGORIAS_GASTOS, GastoFijoPlantilla } from '../types';
import { formatMontoInput, parseMontoInput } from '../lib/formatMonto';
import './RegistrarMovimiento.css';

interface PrecompletadoData {
  monto?: number;
  fecha?: string;
  descripcion?: string;
  medioPago?: string;
}

export default function RegistrarMovimiento() {
  const { currentUser, users } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const precompletado = (location.state as any)?.precompletado as PrecompletadoData | undefined;

  const [tipo, setTipo] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [formData, setFormData] = useState({
    descripcion: precompletado?.descripcion || '',
    monto: precompletado?.monto ? formatMontoInput(String(precompletado.monto)) : '',
    fecha: precompletado?.fecha || new Date().toISOString().split('T')[0],
    categoria: CATEGORIAS_GASTOS[0],
    medio_pago: precompletado?.medioPago || MEDIOS_PAGO[0],
    quien_pago: currentUser?.id || '',
    nota: '',
    gasto_fijo_id: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [gastosFijos, setGastosFijos] = useState<GastoFijoPlantilla[]>([]);
  const esEscaneo = !!precompletado;

  useEffect(() => {
    cargarGastosFijos();
  }, []);

  async function cargarGastosFijos() {
    const { familiaId } = useApp();
    if (!familiaId) return;

    const { data } = await supabase
      .from('gastos_fijos_plantilla')
      .select('*')
      .eq('activo', true)
      .eq('familia_id', familiaId)
      .order('nombre');

    if (data) {
      setGastosFijos(data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setGuardando(true);

    const movimiento = {
      tipo,
      descripcion: formData.descripcion,
      monto: parseMontoInput(formData.monto),
      fecha: formData.fecha,
      categoria: tipo === 'EGRESO' ? formData.categoria : null,
      medio_pago: formData.medio_pago,
      quien_pago: formData.quien_pago,
      sale_de_caja: false,
      nota: formData.nota || null,
      registrado_por: currentUser.id
    };

    const { error: movimientoError } = await supabase
      .from('movimientos')
      .insert([movimiento]);

    if (movimientoError) {
      setGuardando(false);
      alert('Error al guardar el movimiento');
      return;
    }

    if (tipo === 'EGRESO' && formData.gasto_fijo_id) {
      const historialPago = {
        gasto_fijo_id: formData.gasto_fijo_id,
        monto: parseMontoInput(formData.monto),
        fecha_pago: formData.fecha,
        medio_pago: formData.medio_pago,
        registrado_por: currentUser.id
      };

      const { error: historialError } = await supabase
        .from('historial_pagos_gastos_fijos')
        .insert([historialPago]);

      if (historialError) {
        console.error('Error al registrar pago en gasto fijo:', historialError);
      }
    }

    setGuardando(false);
    navigate('/caja');
  }

  function updateForm(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div className="registrar-movimiento">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <h1>Registrar Movimiento</h1>
      </div>

      {esEscaneo && (
        <div className="escaneo-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <div>
            <div className="escaneo-title">Comprobante escaneado</div>
            <div className="escaneo-subtitle">Revisa y ajusta los datos antes de guardar</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="movimiento-form">
        <div className="tipo-selector">
          <button
            type="button"
            className={`tipo-btn ${tipo === 'INGRESO' ? 'active ingreso' : ''}`}
            onClick={() => setTipo('INGRESO')}
          >
            Ingreso
          </button>
          <button
            type="button"
            className={`tipo-btn ${tipo === 'EGRESO' ? 'active egreso' : ''}`}
            onClick={() => setTipo('EGRESO')}
          >
            Gasto
          </button>
        </div>

        <div className="form-group">
          <label>Descripción *</label>
          <input
            type="text"
            value={formData.descripcion}
            onChange={e => updateForm('descripcion', e.target.value)}
            placeholder={tipo === 'INGRESO' ? 'Ej: Efectivo semana' : 'Ej: Compra supermercado'}
            required
          />
        </div>

        <div className="form-group">
          <label>Monto *</label>
          <input
            type="text"
            inputMode="numeric"
            value={formData.monto}
            onChange={e => updateForm('monto', formatMontoInput(e.target.value))}
            placeholder="$0"
            required
          />
        </div>

        <div className="form-group">
          <label>Fecha *</label>
          <input
            type="date"
            value={formData.fecha}
            onChange={e => updateForm('fecha', e.target.value)}
            required
          />
        </div>

        {tipo === 'EGRESO' && (
          <>
            <div className="form-group">
              <label>¿Es un gasto fijo?</label>
              <select
                value={formData.gasto_fijo_id}
                onChange={e => {
                  const gastoId = e.target.value;
                  updateForm('gasto_fijo_id', gastoId);
                  if (gastoId) {
                    const gasto = gastosFijos.find(g => g.id === gastoId);
                    if (gasto) {
                      updateForm('descripcion', gasto.nombre);
                      updateForm('monto', formatMontoInput(gasto.monto_estimado.toString()));
                      updateForm('categoria', 'Servicios');
                    }
                  }
                }}
              >
                <option value="">No, es un gasto variable</option>
                {gastosFijos.map(gasto => (
                  <option key={gasto.id} value={gasto.id}>{gasto.nombre}</option>
                ))}
              </select>
            </div>

            {!formData.gasto_fijo_id && (
              <div className="form-group">
                <label>Categoría *</label>
                <select
                  value={formData.categoria}
                  onChange={e => updateForm('categoria', e.target.value)}
                  required
                >
                  {CATEGORIAS_GASTOS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Quién pagó *</label>
              <select
                value={formData.quien_pago}
                onChange={e => updateForm('quien_pago', e.target.value)}
                required
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.nombre}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label>Medio de pago *</label>
          <select
            value={formData.medio_pago}
            onChange={e => updateForm('medio_pago', e.target.value)}
            required
          >
            {MEDIOS_PAGO.map(medio => (
              <option key={medio} value={medio}>{medio}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Nota (opcional)</label>
          <textarea
            value={formData.nota}
            onChange={e => updateForm('nota', e.target.value)}
            placeholder="Información adicional..."
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className={`btn ${tipo === 'INGRESO' ? 'btn-secondary' : 'btn-primary'}`}
            disabled={guardando}
          >
            {guardando ? 'Guardando...' : 'Registrar movimiento'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => navigate(-1)}
            disabled={guardando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
