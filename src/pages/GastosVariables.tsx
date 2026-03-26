import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { Movimiento, CATEGORIAS_GASTOS } from '../types';
import './GastosVariables.css';

export default function GastosVariables() {
  const navigate = useNavigate();
  const [gastos, setGastos] = useState<Movimiento[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('TODAS');
  const [totalPorCategoria, setTotalPorCategoria] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

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
                <div className="gasto-header">
                  <span className="gasto-categoria">{gasto.categoria}</span>
                  <span className="gasto-fecha">
                    {new Date(gasto.fecha).toLocaleDateString('es-AR')}
                  </span>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
