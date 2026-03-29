import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { Movimiento, CATEGORIAS_GASTOS, MEDIOS_PAGO } from '../types';
import { formatMontoInput, parseMontoInput } from '../lib/formatMonto';
import { useApp } from '../context/AppContext';
import './GastosVariables.css';

export default function GastosVariables() {
  const navigate = useNavigate();
  const { users } = useApp();
  const [gastos, setGastos] = useState<Movimiento[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('TODAS');
  const [totalPorCategoria, setTotalPorCategoria] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [formEdit, setFormEdit] = useState<any>({});

  useEffect(() => {
    cargarGastos();
  }, []);

  async function cargarGastos() {
    setLoading(true);

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('movimientos')
      .select(`
        *,
        usuario:registrado_por(nombre)
      `)
      .eq('tipo', 'EGRESO')
      .gte('fecha', inicioMes.toISOString().split('T')[0])
      .order('fecha', { ascending: false });

    if (data) {
      setGastos(data);
      calcularTotales(data);
    }

    setLoading(false);
  }

  function calcularTotales(gastos: Movimiento[]) {
    const totales: Record<string, number> = {};

    gastos.forEach(gasto => {
      const categoria = gasto.categoria || 'Sin categoría';
      totales[categoria] = (totales[categoria] || 0) + Number(gasto.monto);
    });

    setTotalPorCategoria(totales);
  }

  function iniciarEdicion(gasto: Movimiento) {
    setEditando(gasto.id);
    setFormEdit({
      descripcion: gasto.descripcion,
      monto: formatMontoInput(String(gasto.monto)),
      fecha: gasto.fecha,
      categoria: gasto.categoria || CATEGORIAS_GASTOS[0],
      medio_pago: gasto.medio_pago,
      quien_pago: gasto.quien_pago,
      nota: gasto.nota || ''
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
      cargarGastos();
    } else {
      alert('Error al actualizar el gasto');
    }
  }

  async function eliminarGasto(id: string) {
    if (!confirm('¿Seguro que deseas eliminar este gasto? Esta acción no se puede deshacer.')) {
      return;
    }

    const { error } = await supabase
      .from('movimientos')
      .delete()
      .eq('id', id);

    if (!error) {
      cargarGastos();
    } else {
      alert('Error al eliminar el gasto');
    }
  }

  const gastosFiltrados = categoriaSeleccionada === 'TODAS'
    ? gastos
    : gastos.filter(g => g.categoria === categoriaSeleccionada);

  const totalGeneral = Object.values(totalPorCategoria).reduce((a, b) => a + b, 0);

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="gastos-variables">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <h1>Gastos variables</h1>
        <p style={{ textTransform: 'capitalize' }}>{new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="gastos-total-card">
        <div className="total-label">Total gastado este mes</div>
        <div className="total-valor">{formatCurrency(totalGeneral)}</div>
      </div>

      <div className="categorias-grid">
        {Object.entries(totalPorCategoria)
          .sort((a, b) => b[1] - a[1])
          .map(([categoria, total]) => (
            <div key={categoria} className="categoria-card">
              <div className="categoria-nombre">{categoria}</div>
              <div className="categoria-total">{formatCurrency(total)}</div>
            </div>
          ))}
      </div>

      <button
        className="registrar-gasto-btn"
        onClick={() => navigate('/registrar')}
      >
        ➕ Registrar gasto
      </button>

      <div className="section">
        <div className="section-header">
          <h2>Detalle de gastos</h2>
          <select
            className="categoria-filter"
            value={categoriaSeleccionada}
            onChange={e => setCategoriaSeleccionada(e.target.value)}
          >
            <option value="TODAS">Todas las categorías</option>
            {CATEGORIAS_GASTOS.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {gastosFiltrados.length === 0 ? (
          <p className="empty-state">No hay gastos en esta categoría</p>
        ) : (
          <div className="gastos-list">
            {gastosFiltrados.map(gasto => (
              <div key={gasto.id} className="gasto-item">
                {editando === gasto.id ? (
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
                        onClick={() => guardarEdicion(gasto.id)}
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
                    <div className="gasto-header">
                      <span className="gasto-categoria">{gasto.categoria}</span>
                      <span className="gasto-fecha">
                        {new Date(gasto.fecha).toLocaleDateString('es-AR')}
                      </span>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => iniciarEdicion(gasto)}
                          title="Editar gasto"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => eliminarGasto(gasto.id)}
                          title="Eliminar gasto"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h3>{gasto.descripcion}</h3>

                    <div className="gasto-detalles">
                      <span>{gasto.medio_pago}</span>
                      <span>{gasto.sale_de_caja ? 'Desde caja' : 'Pago directo'}</span>
                      <span>{gasto.usuario?.nombre}</span>
                    </div>

                    {gasto.nota && (
                      <p className="gasto-nota">{gasto.nota}</p>
                    )}

                    <div className="gasto-monto">
                      {formatCurrency(gasto.monto)}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
