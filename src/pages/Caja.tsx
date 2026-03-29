import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { Movimiento, MEDIOS_PAGO, CATEGORIAS_GASTOS } from '../types';
import { formatMontoInput, parseMontoInput } from '../lib/formatMonto';
import { useApp } from '../context/AppContext';
import './Caja.css';

export default function Caja() {
  const navigate = useNavigate();
  const { users } = useApp();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    saldoEfectivo: 0,
    ingresosMes: 0,
    egresosMes: 0
  });
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState('actual');
  const [editando, setEditando] = useState<string | null>(null);
  const [formEdit, setFormEdit] = useState<any>({});

  useEffect(() => {
    cargarDatos();
  }, [filtroMes]);

  async function cargarDatos() {
    setLoading(true);
    await Promise.all([
      cargarMovimientos(),
      calcularEstadisticas()
    ]);
    setLoading(false);
  }

  async function cargarMovimientos() {
    let query = supabase
      .from('movimientos')
      .select(`
        *,
        usuario:registrado_por(nombre)
      `)
      .order('fecha', { ascending: false });

    if (filtroMes === 'actual') {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      query = query.gte('fecha', inicioMes.toISOString().split('T')[0]);
    }

    const { data } = await query;

    if (data) {
      setMovimientos(data);
    }
  }

  async function calcularEstadisticas() {
    const { data: todos } = await supabase
      .from('movimientos')
      .select('tipo, monto, medio_pago, fecha');

    let saldoEfectivo = 0;
    let ingresosMes = 0;
    let egresosMes = 0;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    if (todos) {
      todos.forEach(m => {
        const esDeMesActual = new Date(m.fecha) >= inicioMes;
        const monto = Number(m.monto);

        if (m.tipo === 'INGRESO') {
          if (esDeMesActual) {
            ingresosMes += monto;
          }
          if (m.medio_pago === 'Efectivo') {
            saldoEfectivo += monto;
          }
        } else {
          if (esDeMesActual) {
            egresosMes += monto;
          }
          if (m.medio_pago === 'Efectivo') {
            saldoEfectivo -= monto;
          }
        }
      });
    }

    setEstadisticas({ saldoEfectivo, ingresosMes, egresosMes });
  }

  async function eliminarMovimiento(id: string) {
    if (!confirm('¿Seguro que deseas eliminar este movimiento? Esta acción no se puede deshacer.')) {
      return;
    }

    const { error } = await supabase
      .from('movimientos')
      .delete()
      .eq('id', id);

    if (!error) {
      cargarDatos();
    } else {
      alert('Error al eliminar el movimiento');
    }
  }

  function iniciarEdicion(mov: Movimiento) {
    setEditando(mov.id);
    setFormEdit({
      descripcion: mov.descripcion,
      monto: formatMontoInput(String(mov.monto)),
      fecha: mov.fecha,
      categoria: mov.categoria || CATEGORIAS_GASTOS[0],
      medio_pago: mov.medio_pago,
      quien_pago: mov.quien_pago,
      nota: mov.nota || ''
    });
  }

  function cancelarEdicion() {
    setEditando(null);
    setFormEdit({});
  }

  async function guardarEdicion(id: string) {
    const { error } = await supabase
      .from('movimientos')
      .update({
        descripcion: formEdit.descripcion,
        monto: parseMontoInput(formEdit.monto),
        fecha: formEdit.fecha,
        categoria: formEdit.categoria,
        medio_pago: formEdit.medio_pago,
        quien_pago: formEdit.quien_pago,
        nota: formEdit.nota || null
      })
      .eq('id', id);

    if (!error) {
      setEditando(null);
      setFormEdit({});
      cargarDatos();
    } else {
      alert('Error al actualizar el movimiento');
    }
  }

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="caja">
      <div className="caja-header">
        <button className="back-button" onClick={() => navigate('/')} style={{ color: 'white' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <h1>Caja de la Casa</h1>
        <p>Gestionada por Carolina Daniel</p>
      </div>

      <div className="caja-saldo-hero">
        <div className="saldo-icon">💵</div>
        <div className="saldo-info">
          <div className="saldo-label">Efectivo disponible</div>
          <div className="saldo-valor">{formatCurrency(estadisticas.saldoEfectivo)}</div>
        </div>
      </div>

      <div className="caja-stats">
        <div className="caja-stat ingreso">
          <div className="caja-stat-label">Ingresos del mes</div>
          <div className="caja-stat-valor">+{formatCurrency(estadisticas.ingresosMes).replace(/^[^0-9-]+/, '')}</div>
        </div>
        <div className="caja-stat egreso">
          <div className="caja-stat-label">Egresos del mes</div>
          <div className="caja-stat-valor">-{formatCurrency(estadisticas.egresosMes).replace(/^[^0-9-]+/, '')}</div>
        </div>
      </div>

      <div className="caja-filtros">
        <button
          className={`filtro-btn ${filtroMes === 'actual' ? 'active' : ''}`}
          onClick={() => setFiltroMes('actual')}
        >
          Mes actual
        </button>
        <button
          className={`filtro-btn ${filtroMes === 'todos' ? 'active' : ''}`}
          onClick={() => setFiltroMes('todos')}
        >
          Todos
        </button>
      </div>

      <div className="section">
        <h2>Historial de movimientos</h2>
        {movimientos.length === 0 ? (
          <p className="empty-state">No hay movimientos registrados</p>
        ) : (
          <>
            {['MP Maxi', 'MP Caro', 'Efectivo'].map(medioPago => {
              const movsPorMedio = movimientos.filter(m => m.medio_pago === medioPago);
              if (movsPorMedio.length === 0) return null;

              return (
                <div key={medioPago} className="medio-pago-section">
                  <h3 className="medio-pago-header">{medioPago}</h3>
                  <div className="movimientos-list">
                    {movsPorMedio.map(mov => (
                      <div key={mov.id} className={`movimiento-card ${mov.tipo.toLowerCase()}`}>
                        {editando === mov.id ? (
                          <div className="edit-form">
                            <div className="form-group">
                              <label>Descripción</label>
                              <input
                                type="text"
                                value={formEdit.descripcion}
                                onChange={e => setFormEdit({...formEdit, descripcion: e.target.value})}
                              />
                            </div>
                            <div className="form-group">
                              <label>Monto</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formEdit.monto}
                                onChange={e => setFormEdit({...formEdit, monto: formatMontoInput(e.target.value)})}
                              />
                            </div>
                            <div className="form-group">
                              <label>Fecha</label>
                              <input
                                type="date"
                                value={formEdit.fecha}
                                onChange={e => setFormEdit({...formEdit, fecha: e.target.value})}
                              />
                            </div>
                            {mov.tipo === 'EGRESO' && (
                              <div className="form-group">
                                <label>Categoría</label>
                                <select
                                  value={formEdit.categoria}
                                  onChange={e => setFormEdit({...formEdit, categoria: e.target.value})}
                                >
                                  {CATEGORIAS_GASTOS.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="form-group">
                              <label>Medio de pago</label>
                              <select
                                value={formEdit.medio_pago}
                                onChange={e => setFormEdit({...formEdit, medio_pago: e.target.value})}
                              >
                                {MEDIOS_PAGO.map(medio => (
                                  <option key={medio} value={medio}>{medio}</option>
                                ))}
                              </select>
                            </div>
                            {mov.tipo === 'EGRESO' && (
                              <div className="form-group">
                                <label>Quién pagó</label>
                                <select
                                  value={formEdit.quien_pago}
                                  onChange={e => setFormEdit({...formEdit, quien_pago: e.target.value})}
                                >
                                  {users.map(user => (
                                    <option key={user.id} value={user.id}>{user.nombre}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="form-group">
                              <label>Nota</label>
                              <textarea
                                value={formEdit.nota}
                                onChange={e => setFormEdit({...formEdit, nota: e.target.value})}
                                rows={2}
                              />
                            </div>
                            <div className="edit-actions">
                              <button
                                className="btn-save"
                                onClick={() => guardarEdicion(mov.id)}
                              >
                                Guardar cambios
                              </button>
                              <button
                                className="btn-cancel"
                                onClick={cancelarEdicion}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="movimiento-header">
                              <span className={`badge badge-${mov.tipo.toLowerCase()}`}>
                                {mov.tipo}
                              </span>
                              <span className="movimiento-fecha">
                                {new Date(mov.fecha).toLocaleDateString('es-AR')}
                              </span>
                              <div className="action-buttons">
                                <button
                                  className="edit-btn"
                                  onClick={() => iniciarEdicion(mov)}
                                  title="Editar movimiento"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() => eliminarMovimiento(mov.id)}
                                  title="Eliminar movimiento"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                                  </svg>
                                </button>
                              </div>
                            </div>

                            <div className="movimiento-body">
                              <h3>{mov.descripcion}</h3>
                              {mov.categoria && (
                                <p className="movimiento-categoria">{mov.categoria}</p>
                              )}
                              <div className="movimiento-detalles">
                                <span>{mov.usuario?.nombre}</span>
                              </div>
                              {mov.nota && (
                                <p className="movimiento-nota">{mov.nota}</p>
                              )}
                            </div>

                            <div className={`movimiento-monto ${mov.tipo.toLowerCase()}`}>
                              {mov.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(mov.monto).replace(/^[^0-9-]+/, '')}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
