import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { GastoFijoPlantilla, HistorialPagoGastoFijo, MEDIOS_PAGO } from '../types';
import { useApp } from '../context/AppContext';
import { formatMontoInput, parseMontoInput } from '../lib/formatMonto';
import { showToast } from '../lib/toast';
import './GastosFijos.css';

export default function GastosFijos() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [plantillas, setPlantillas] = useState<GastoFijoPlantilla[]>([]);
  const [historialMap, setHistorialMap] = useState<Record<string, HistorialPagoGastoFijo[]>>({});
  const [loading, setLoading] = useState(true);
  const [modoEdicion, setModoEdicion] = useState<string | null>(null);
  const [modoCreacion, setModoCreacion] = useState(false);
  const [modoPago, setModoPago] = useState<string | null>(null);
  const [formPlantilla, setFormPlantilla] = useState({
    nombre: '',
    monto_estimado: '',
    dia_pago: '',
    dia_vencimiento: ''
  });
  const [formPago, setFormPago] = useState({
    monto: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    medio_pago: 'Efectivo'
  });
  const [editandoHistorial, setEditandoHistorial] = useState<string | null>(null);
  const [formEditHistorial, setFormEditHistorial] = useState({
    monto: '',
    fecha_pago: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    await Promise.all([cargarPlantillas(), cargarHistorial()]);
    setLoading(false);
  }

  function calcularDiasRestantes(diaVencimiento: number | null): number | null {
    if (!diaVencimiento) return null;

    const hoy = new Date();
    const diaActual = hoy.getDate();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    let fechaVencimiento = new Date(anioActual, mesActual, diaVencimiento);

    if (diaActual > diaVencimiento) {
      fechaVencimiento = new Date(anioActual, mesActual + 1, diaVencimiento);
    }

    const diferenciaMilisegundos = fechaVencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

    return diasRestantes;
  }

  async function cargarPlantillas() {
    const { data } = await supabase
      .from('gastos_fijos_plantilla')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (data) {
      const plantillasConDias = data.map(plantilla => ({
        ...plantilla,
        diasRestantes: calcularDiasRestantes(plantilla.dia_vencimiento)
      }));
      setPlantillas(plantillasConDias);
    }
  }

  async function cargarHistorial() {
    const { data } = await supabase
      .from('historial_pagos_gastos_fijos')
      .select(`
        *,
        usuario:registrado_por(nombre)
      `)
      .order('fecha_pago', { ascending: false });

    if (data) {
      const grouped: Record<string, HistorialPagoGastoFijo[]> = {};
      data.forEach(pago => {
        if (!grouped[pago.plantilla_id]) {
          grouped[pago.plantilla_id] = [];
        }
        grouped[pago.plantilla_id].push(pago);
      });
      setHistorialMap(grouped);
    }
  }

  async function crearPlantilla() {
    if (!formPlantilla.nombre.trim()) return;

    const { error } = await supabase
      .from('gastos_fijos_plantilla')
      .insert({
        nombre: formPlantilla.nombre,
        monto_estimado: formPlantilla.monto_estimado ? parseMontoInput(formPlantilla.monto_estimado) : 0,
        dia_pago: formPlantilla.dia_pago,
        dia_vencimiento: formPlantilla.dia_vencimiento ? parseInt(formPlantilla.dia_vencimiento) : null,
        activo: true
      });

    if (!error) {
      setModoCreacion(false);
      setFormPlantilla({ nombre: '', monto_estimado: '', dia_pago: '', dia_vencimiento: '' });
      cargarPlantillas();
    }
  }

  async function editarPlantilla(id: string) {
    const { error } = await supabase
      .from('gastos_fijos_plantilla')
      .update({
        nombre: formPlantilla.nombre,
        monto_estimado: formPlantilla.monto_estimado ? parseMontoInput(formPlantilla.monto_estimado) : 0,
        dia_pago: formPlantilla.dia_pago,
        dia_vencimiento: formPlantilla.dia_vencimiento ? parseInt(formPlantilla.dia_vencimiento) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (!error) {
      setModoEdicion(null);
      setFormPlantilla({ nombre: '', monto_estimado: '', dia_pago: '', dia_vencimiento: '' });
      cargarPlantillas();
    }
  }

  async function eliminarPlantilla(id: string) {
    if (!confirm('¿Estás seguro de eliminar este gasto fijo?')) return;

    const { error } = await supabase
      .from('gastos_fijos_plantilla')
      .update({ activo: false })
      .eq('id', id);

    if (!error) {
      cargarPlantillas();
    }
  }

  async function registrarPago(plantillaId: string) {
    if (!currentUser || !formPago.monto) return;

    const fecha = new Date(formPago.fecha_pago);
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();

    const { error } = await supabase
      .from('historial_pagos_gastos_fijos')
      .insert({
        plantilla_id: plantillaId,
        monto: parseMontoInput(formPago.monto),
        fecha_pago: formPago.fecha_pago,
        medio_pago: formPago.medio_pago,
        mes,
        anio,
        registrado_por: currentUser.id
      });

    if (!error) {
      setModoPago(null);
      setFormPago({
        monto: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        medio_pago: 'Efectivo'
      });
      cargarHistorial();
    }
  }

  async function eliminarPago(pagoId: string) {
    if (!confirm('¿Estás seguro de eliminar este pago?')) return;

    const { error } = await supabase
      .from('historial_pagos_gastos_fijos')
      .delete()
      .eq('id', pagoId);

    if (!error) {
      cargarHistorial();
    }
  }

  async function saltearMes(plantillaId: string, nombrePlantilla: string) {
    if (!currentUser) return;
    if (!confirm(`¿Saltear ${nombrePlantilla} este mes? Se marcará como pagado con monto $0`)) return;

    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();

    const { error } = await supabase
      .from('historial_pagos_gastos_fijos')
      .insert({
        plantilla_id: plantillaId,
        monto: 0,
        fecha_pago: hoy.toISOString().split('T')[0],
        medio_pago: 'N/A',
        mes,
        anio,
        nota: 'Salteado',
        registrado_por: currentUser.id
      });

    if (!error) {
      showToast('✓ Mes salteado', 'success');
      cargarHistorial();
    } else {
      showToast('Error al saltear el mes', 'error');
    }
  }

  function iniciarEdicionHistorial(pago: HistorialPagoGastoFijo) {
    setEditandoHistorial(pago.id);
    setFormEditHistorial({
      monto: formatMontoInput(String(pago.monto)),
      fecha_pago: pago.fecha_pago
    });
  }

  function cancelarEdicionHistorial() {
    setEditandoHistorial(null);
    setFormEditHistorial({ monto: '', fecha_pago: '' });
  }

  async function guardarEdicionHistorial(pagoId: string) {
    const { error } = await supabase
      .from('historial_pagos_gastos_fijos')
      .update({
        monto: parseMontoInput(formEditHistorial.monto),
        fecha_pago: formEditHistorial.fecha_pago
      })
      .eq('id', pagoId);

    if (!error) {
      showToast('✓ Pago actualizado', 'success');
      setEditandoHistorial(null);
      setFormEditHistorial({ monto: '', fecha_pago: '' });
      cargarHistorial();
    } else {
      showToast('Error al actualizar el pago', 'error');
    }
  }

  function iniciarEdicion(plantilla: GastoFijoPlantilla) {
    setModoEdicion(plantilla.id);
    setFormPlantilla({
      nombre: plantilla.nombre,
      monto_estimado: plantilla.monto_estimado ? formatMontoInput(plantilla.monto_estimado.toString()) : '',
      dia_pago: plantilla.dia_pago || '',
      dia_vencimiento: plantilla.dia_vencimiento?.toString() || ''
    });
  }

  function iniciarPago(plantilla: GastoFijoPlantilla) {
    setModoPago(plantilla.id);
    setFormPago({
      monto: plantilla.monto_estimado ? formatMontoInput(plantilla.monto_estimado.toString()) : '',
      fecha_pago: new Date().toISOString().split('T')[0],
      medio_pago: 'Efectivo'
    });
  }

  function getUltimoPago(plantillaId: string): HistorialPagoGastoFijo | null {
    const pagos = historialMap[plantillaId];
    return pagos && pagos.length > 0 ? pagos[0] : null;
  }

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="gastos-fijos">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <h1>Gastos Fijos</h1>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Plantillas de Gastos Fijos</h2>
          {!modoCreacion && (
            <button className="btn btn-primary" onClick={() => setModoCreacion(true)}>
              + Agregar nuevo
            </button>
          )}
        </div>

        {modoCreacion && (
          <div className="form-card">
            <h3>Nuevo Gasto Fijo</h3>
            <div className="form-group">
              <label>Nombre del gasto</label>
              <input
                type="text"
                value={formPlantilla.nombre}
                onChange={e => setFormPlantilla({ ...formPlantilla, nombre: e.target.value })}
                placeholder="Ej: Luz, Gas, Internet"
              />
            </div>
            <div className="form-group">
              <label>Monto estimado</label>
              <input
                type="text"
                inputMode="numeric"
                value={formPlantilla.monto_estimado}
                onChange={e => setFormPlantilla({ ...formPlantilla, monto_estimado: formatMontoInput(e.target.value) })}
                placeholder="$0"
              />
            </div>
            <div className="form-group">
              <label>Día de pago</label>
              <input
                type="text"
                value={formPlantilla.dia_pago}
                onChange={e => setFormPlantilla({ ...formPlantilla, dia_pago: e.target.value })}
                placeholder="Ej: 10 de cada mes"
              />
            </div>
            <div className="form-group">
              <label>Día de vencimiento (1-31)</label>
              <input
                type="number"
                value={formPlantilla.dia_vencimiento}
                onChange={e => setFormPlantilla({ ...formPlantilla, dia_vencimiento: e.target.value })}
                placeholder="Ej: 10"
                min="1"
                max="31"
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={crearPlantilla}>
                Crear
              </button>
              <button className="btn" onClick={() => {
                setModoCreacion(false);
                setFormPlantilla({ nombre: '', monto_estimado: '', dia_pago: '', dia_vencimiento: '' });
              }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="gastos-list">
          {plantillas.map(plantilla => {
            const ultimoPago = getUltimoPago(plantilla.id);
            const historial = historialMap[plantilla.id] || [];

            return (
              <div key={plantilla.id} className="gasto-card">
                {modoEdicion === plantilla.id ? (
                  <div className="form-card">
                    <h3>Editar Gasto</h3>
                    <div className="form-group">
                      <label>Nombre del gasto</label>
                      <input
                        type="text"
                        value={formPlantilla.nombre}
                        onChange={e => setFormPlantilla({ ...formPlantilla, nombre: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Monto estimado</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formPlantilla.monto_estimado}
                        onChange={e => setFormPlantilla({ ...formPlantilla, monto_estimado: formatMontoInput(e.target.value) })}
                        placeholder="$0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Día de pago</label>
                      <input
                        type="text"
                        value={formPlantilla.dia_pago}
                        onChange={e => setFormPlantilla({ ...formPlantilla, dia_pago: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Día de vencimiento (1-31)</label>
                      <input
                        type="number"
                        value={formPlantilla.dia_vencimiento}
                        onChange={e => setFormPlantilla({ ...formPlantilla, dia_vencimiento: e.target.value })}
                        min="1"
                        max="31"
                      />
                    </div>
                    <div className="form-actions">
                      <button className="btn btn-primary" onClick={() => editarPlantilla(plantilla.id)}>
                        Guardar
                      </button>
                      <button className="btn" onClick={() => {
                        setModoEdicion(null);
                        setFormPlantilla({ nombre: '', monto_estimado: '', dia_pago: '', dia_vencimiento: '' });
                      }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : modoPago === plantilla.id ? (
                  <div className="form-card">
                    <h3>Registrar Pago: {plantilla.nombre}</h3>
                    <div className="form-group">
                      <label>Monto pagado</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formPago.monto}
                        onChange={e => setFormPago({ ...formPago, monto: formatMontoInput(e.target.value) })}
                        placeholder="$0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha de pago</label>
                      <input
                        type="date"
                        value={formPago.fecha_pago}
                        onChange={e => setFormPago({ ...formPago, fecha_pago: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Medio de pago</label>
                      <select
                        value={formPago.medio_pago}
                        onChange={e => setFormPago({ ...formPago, medio_pago: e.target.value })}
                      >
                        {MEDIOS_PAGO.map(medio => (
                          <option key={medio} value={medio}>{medio}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-actions">
                      <button className="btn btn-primary" onClick={() => registrarPago(plantilla.id)}>
                        Confirmar pago
                      </button>
                      <button className="btn" onClick={() => {
                        setModoPago(null);
                        setFormPago({
                          monto: '',
                          fecha_pago: new Date().toISOString().split('T')[0],
                          medio_pago: 'Efectivo'
                        });
                      }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="gasto-info">
                      <div className="gasto-header-row">
                        <h3>{plantilla.nombre}</h3>
                        {plantilla.diasRestantes !== null && plantilla.diasRestantes !== undefined && (
                          <span className={`vencimiento-badge ${
                            plantilla.diasRestantes === 0 ? 'vence-hoy' :
                            plantilla.diasRestantes <= 5 ? 'vence-pronto' :
                            'vence-normal'
                          }`}>
                            {plantilla.diasRestantes === 0 ? 'Vence hoy' : `Vence en ${plantilla.diasRestantes} días`}
                          </span>
                        )}
                      </div>
                      {plantilla.dia_pago && (
                        <p className="gasto-day">{plantilla.dia_pago}</p>
                      )}

                      <div className="gasto-montos">
                        <div className="monto-item">
                          <span className="monto-label">Monto actual:</span>
                          <span className="monto-valor actual">
                            {formatCurrency(plantilla.monto_estimado)} / mes
                          </span>
                        </div>
                        {ultimoPago && (
                          <div className="monto-item">
                            <span className="monto-label">Último pago:</span>
                            <span className="monto-valor ultimo">
                              {formatCurrency(ultimoPago.monto)}
                            </span>
                            <span className="fecha-pequena">
                              ({new Date(ultimoPago.fecha_pago).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })})
                            </span>
                          </div>
                        )}
                      </div>

                      {historial.length > 0 && (
                        <details className="historial-detalle">
                          <summary>Ver historial ({historial.length} pagos)</summary>
                          <div className="historial-list">
                            {historial.map(pago => (
                              <div key={pago.id} className="historial-item">
                                {editandoHistorial === pago.id ? (
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formEditHistorial.monto}
                                        onChange={e => setFormEditHistorial({...formEditHistorial, monto: formatMontoInput(e.target.value)})}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}
                                      />
                                      <input
                                        type="date"
                                        value={formEditHistorial.fecha_pago}
                                        onChange={e => setFormEditHistorial({...formEditHistorial, fecha_pago: e.target.value})}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}
                                      />
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                          onClick={() => guardarEdicionHistorial(pago.id)}
                                          style={{ flex: 1, padding: '6px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px' }}
                                        >
                                          Guardar
                                        </button>
                                        <button
                                          onClick={cancelarEdicionHistorial}
                                          style={{ flex: 1, padding: '6px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '13px' }}
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="historial-info">
                                      <p className="historial-monto">
                                        {formatCurrency(pago.monto)}
                                        {pago.nota && <span style={{ fontSize: '11px', color: 'var(--warning)', marginLeft: '6px' }}>({pago.nota})</span>}
                                      </p>
                                      <p className="historial-fecha">
                                        {new Date(pago.fecha_pago).toLocaleDateString('es-AR')}
                                      </p>
                                      <p className="historial-medio">{pago.medio_pago}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        className="btn-icon"
                                        onClick={() => iniciarEdicionHistorial(pago)}
                                        title="Editar pago"
                                        style={{ color: 'var(--primary)' }}
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                      </button>
                                      <button
                                        className="btn-icon btn-danger"
                                        onClick={() => eliminarPago(pago.id)}
                                        title="Eliminar pago"
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    <div className="gasto-actions">
                      <button className="btn btn-primary" onClick={() => iniciarPago(plantilla)}>
                        Registrar pago
                      </button>
                      <button className="btn" onClick={() => saltearMes(plantilla.id, plantilla.nombre)} style={{ background: '#F59E0B', color: 'white' }}>
                        Saltear este mes
                      </button>
                      <button className="btn" onClick={() => iniciarEdicion(plantilla)}>
                        Editar
                      </button>
                      <button className="btn btn-danger" onClick={() => eliminarPlantilla(plantilla.id)}>
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {plantillas.length === 0 && !modoCreacion && (
          <div className="empty-state">
            <p>No hay gastos fijos configurados.</p>
            <p>Agrega uno nuevo para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
