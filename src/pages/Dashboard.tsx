import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { GastoFijoMes, Movimiento, GastoFijoPlantilla } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import InteligenciaFinanciera from '../components/InteligenciaFinanciera';
import VistaAnual from '../components/VistaAnual';
import MesesAnteriores from '../components/MesesAnteriores';
import './Dashboard.css';

interface GastoPorCategoria {
  categoria: string;
  monto: number;
}

interface GastoMensual {
  mes: string;
  monto: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [gastosPendientes, setGastosPendientes] = useState<GastoFijoMes[]>([]);
  const [ultimosMovimientos, setUltimosMovimientos] = useState<Movimiento[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    totalGastado: 0,
    fijosPagados: 0,
    fijosPendientes: 0,
    saldoCaja: 0
  });
  const [fotoInicio, setFotoInicio] = useState('/image0.jpeg');
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear());
  const [mostrarFiltro, setMostrarFiltro] = useState(false);
  const [gastosPorCategoria, setGastosPorCategoria] = useState<GastoPorCategoria[]>([]);
  const [evolucionMensual, setEvolucionMensual] = useState<GastoMensual[]>([]);
  const [resumenMes, setResumenMes] = useState({
    totalMes: 0,
    variacionMesAnterior: 0,
    categoriaLider: '',
    montoLider: 0
  });
  const [gastosPorMedioPago, setGastosPorMedioPago] = useState<{medio: string, monto: number}[]>([]);
  const [gastosProximosVencer, setGastosProximosVencer] = useState<GastoFijoPlantilla[]>([]);
  const [presupuestoMensual, setPresupuestoMensual] = useState<number | null>(null);
  const [vistaAnual, setVistaAnual] = useState(false);
  const [hayDatosMultiplesMeses, setHayDatosMultiplesMeses] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarDatos();
    verificarDatosMultiplesMeses();
  }, [mesFiltro, anioFiltro]);

  const COLORES = ['#2D3748', '#4A5568', '#718096', '#A0AEC0', '#CBD5E0', '#E2E8F0', '#F56565', '#ED8936', '#ECC94B', '#48BB78', '#38B2AC'];

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

  async function cargarDatos() {
    setLoading(true);

    await Promise.all([
      cargarGastosPendientes(),
      cargarUltimosMovimientos(),
      calcularEstadisticas(),
      cargarFotoInicio(),
      cargarGastosPorCategoria(),
      cargarEvolucionMensual(),
      cargarResumenMes(),
      cargarGastosProximosVencer(),
      cargarGastosPorMedioPago(),
      cargarPresupuestoMensual()
    ]);

    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  }

  async function cargarFotoInicio() {
    const { data } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'foto_inicio')
      .maybeSingle();

    if (data?.valor) {
      setFotoInicio(data.valor);
    }
  }

  async function cargarPresupuestoMensual() {
    const { data } = await supabase
      .from('configuracion')
      .select('presupuesto_mensual')
      .eq('clave', 'foto_inicio')
      .maybeSingle();

    if (data?.presupuesto_mensual) {
      setPresupuestoMensual(Number(data.presupuesto_mensual));
    }
  }

  async function cargarGastosPendientes() {
    const { data } = await supabase
      .from('gastos_fijos_mes')
      .select(`
        *,
        plantilla:gastos_fijos_plantilla(*)
      `)
      .eq('mes', mesFiltro)
      .eq('anio', anioFiltro)
      .eq('estado', 'PENDIENTE')
      .order('created_at');

    if (data) {
      setGastosPendientes(data);
    }
  }

  async function cargarUltimosMovimientos() {
    const startDate = new Date(anioFiltro, mesFiltro - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(anioFiltro, mesFiltro, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from('movimientos')
      .select(`
        *,
        usuario:registrado_por(nombre)
      `)
      .gte('fecha', startDate)
      .lte('fecha', endDate)
      .order('fecha', { ascending: false })
      .limit(5);

    if (data) {
      setUltimosMovimientos(data);
    }
  }

  async function calcularEstadisticas() {
    const { data: fijos } = await supabase
      .from('gastos_fijos_mes')
      .select('estado, monto_real')
      .eq('mes', mesFiltro)
      .eq('anio', anioFiltro);

    const startDate = new Date(anioFiltro, mesFiltro - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(anioFiltro, mesFiltro, 0).toISOString().split('T')[0];

    const { data: historialPagosFijos } = await supabase
      .from('historial_pagos_gastos_fijos')
      .select('monto')
      .gte('fecha_pago', startDate)
      .lte('fecha_pago', endDate);

    const { data: movimientos } = await supabase
      .from('movimientos')
      .select('tipo, monto, medio_pago')
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    let totalGastado = 0;
    let fijosPagados = 0;
    let fijosPendientes = 0;

    if (fijos) {
      fijos.forEach(f => {
        if (f.estado === 'PAGADO') {
          fijosPagados++;
        } else {
          fijosPendientes++;
        }
      });
    }

    if (historialPagosFijos) {
      historialPagosFijos.forEach(p => {
        totalGastado += Number(p.monto);
      });
    }

    let saldoCaja = 0;
    if (movimientos) {
      movimientos.forEach(m => {
        const esEfectivo = m.medio_pago === 'Efectivo';

        if (m.tipo === 'INGRESO') {
          if (esEfectivo) {
            saldoCaja += Number(m.monto);
          }
        } else {
          totalGastado += Number(m.monto);
          if (esEfectivo) {
            saldoCaja -= Number(m.monto);
          }
        }
      });
    }

    setEstadisticas({
      totalGastado,
      fijosPagados,
      fijosPendientes,
      saldoCaja
    });
  }

  async function cargarGastosPorCategoria() {
    const startDate = new Date(anioFiltro, mesFiltro - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(anioFiltro, mesFiltro, 0).toISOString().split('T')[0];

    const { data: movimientos } = await supabase
      .from('movimientos')
      .select('categoria, monto')
      .eq('tipo', 'EGRESO')
      .gte('fecha', startDate)
      .lte('fecha', endDate)
      .not('categoria', 'is', null);

    if (movimientos && movimientos.length > 0) {
      const agrupados: { [key: string]: number } = {};

      movimientos.forEach(m => {
        if (m.categoria) {
          agrupados[m.categoria] = (agrupados[m.categoria] || 0) + Number(m.monto);
        }
      });

      const resultado = Object.entries(agrupados)
        .map(([categoria, monto]) => ({ categoria, monto }))
        .sort((a, b) => b.monto - a.monto);

      setGastosPorCategoria(resultado);
    } else {
      setGastosPorCategoria([]);
    }
  }

  async function cargarGastosPorMedioPago() {
    const startDate = new Date(anioFiltro, mesFiltro - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(anioFiltro, mesFiltro, 0).toISOString().split('T')[0];

    const { data: movimientos } = await supabase
      .from('movimientos')
      .select('medio_pago, monto')
      .eq('tipo', 'EGRESO')
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    if (movimientos && movimientos.length > 0) {
      const agrupados: { [key: string]: number } = {};

      movimientos.forEach(m => {
        if (m.medio_pago) {
          agrupados[m.medio_pago] = (agrupados[m.medio_pago] || 0) + Number(m.monto);
        }
      });

      const resultado = Object.entries(agrupados)
        .map(([medio, monto]) => ({ medio, monto }))
        .sort((a, b) => b.monto - a.monto);

      setGastosPorMedioPago(resultado);
    } else {
      setGastosPorMedioPago([]);
    }
  }

  async function cargarEvolucionMensual() {
    const meses: GastoMensual[] = [];
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(anioFiltro, mesFiltro - 1 - i, 1);
      const mes = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();

      const startDate = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(anio, mes, 0).toISOString().split('T')[0];

      const { data: movimientos } = await supabase
        .from('movimientos')
        .select('monto')
        .eq('tipo', 'EGRESO')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      let total = 0;
      if (movimientos) {
        movimientos.forEach(m => {
          total += Number(m.monto);
        });
      }

      meses.push({
        mes: nombresMeses[mes - 1],
        monto: total
      });
    }

    setEvolucionMensual(meses);
  }

  async function cargarResumenMes() {
    const startDate = new Date(anioFiltro, mesFiltro - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(anioFiltro, mesFiltro, 0).toISOString().split('T')[0];

    const { data: movimientosActuales } = await supabase
      .from('movimientos')
      .select('monto, categoria')
      .eq('tipo', 'EGRESO')
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    let totalMes = 0;
    const categorias: { [key: string]: number } = {};

    if (movimientosActuales) {
      movimientosActuales.forEach(m => {
        totalMes += Number(m.monto);
        if (m.categoria) {
          categorias[m.categoria] = (categorias[m.categoria] || 0) + Number(m.monto);
        }
      });
    }

    const mesAnterior = mesFiltro === 1 ? 12 : mesFiltro - 1;
    const anioAnterior = mesFiltro === 1 ? anioFiltro - 1 : anioFiltro;
    const startDateAnterior = new Date(anioAnterior, mesAnterior - 1, 1).toISOString().split('T')[0];
    const endDateAnterior = new Date(anioAnterior, mesAnterior, 0).toISOString().split('T')[0];

    const { data: movimientosAnteriores } = await supabase
      .from('movimientos')
      .select('monto')
      .eq('tipo', 'EGRESO')
      .gte('fecha', startDateAnterior)
      .lte('fecha', endDateAnterior);

    let totalMesAnterior = 0;
    if (movimientosAnteriores) {
      movimientosAnteriores.forEach(m => {
        totalMesAnterior += Number(m.monto);
      });
    }

    let variacion = 0;
    if (totalMesAnterior > 0) {
      variacion = ((totalMes - totalMesAnterior) / totalMesAnterior) * 100;
    }

    let categoriaLider = '';
    let montoLider = 0;
    Object.entries(categorias).forEach(([cat, monto]) => {
      if (monto > montoLider) {
        categoriaLider = cat;
        montoLider = monto;
      }
    });

    setResumenMes({
      totalMes,
      variacionMesAnterior: variacion,
      categoriaLider,
      montoLider
    });
  }

  async function cargarGastosProximosVencer() {
    const { data } = await supabase
      .from('gastos_fijos_plantilla')
      .select('*')
      .eq('activo', true);

    if (data) {
      const gastosConDias = data
        .map(gasto => ({
          ...gasto,
          diasRestantes: calcularDiasRestantes(gasto.dia_vencimiento)
        }))
        .filter(gasto => gasto.diasRestantes !== null && gasto.diasRestantes <= 5);

      setGastosProximosVencer(gastosConDias);
    }
  }

  async function verificarDatosMultiplesMeses() {
    const { data } = await supabase
      .from('movimientos')
      .select('fecha')
      .eq('tipo', 'EGRESO')
      .order('fecha', { ascending: true });

    if (data && data.length > 0) {
      const fechas = data.map(m => new Date(m.fecha));
      const mesesUnicos = new Set(fechas.map(f => `${f.getFullYear()}-${f.getMonth()}`));
      setHayDatosMultiplesMeses(mesesUnicos.size > 1);
    }
  }


  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  const nombreMesRaw = new Date(anioFiltro, mesFiltro - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const nombreMes = nombreMesRaw.replace(/^(\w)/, (c) => c.toUpperCase()).replace(/ de /g, ' de ');

  return (
    <div className="dashboard">
      {!presupuestoMensual && (
        <div className="alert-banner config-banner" onClick={() => navigate('/config', { state: { fromBanner: true } })}>
          <div className="alert-icon">⚙️</div>
          <div className="alert-text">
            Configurá tu presupuesto mensual para activar la Inteligencia Financiera
          </div>
          <div className="alert-arrow">›</div>
        </div>
      )}

      {gastosProximosVencer.length > 0 && (
        <div className="alert-banner" onClick={() => navigate('/fijos')}>
          <div className="alert-icon">⚠️</div>
          <div className="alert-text">
            Tenés {gastosProximosVencer.length} gasto{gastosProximosVencer.length > 1 ? 's' : ''} fijo{gastosProximosVencer.length > 1 ? 's' : ''} próximo{gastosProximosVencer.length > 1 ? 's' : ''} a vencer
          </div>
          <div className="alert-arrow">›</div>
        </div>
      )}

      <div className="dashboard-header">
        <div className="family-photo">
          <img src={fotoInicio} alt="Familia Franco" />
        </div>
        <div className="header-title-row">
          <h1>{vistaAnual ? `Resumen Anual ${anioFiltro}` : `Resumen de ${nombreMes}`}</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="filter-toggle-btn"
              onClick={() => setMostrarFiltro(!mostrarFiltro)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            <button
              className="filter-toggle-btn"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={refreshing ? 'spinning' : ''}
              >
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
        </div>
        {hayDatosMultiplesMeses && (
          <div className="vista-toggle">
            <button
              className={`vista-toggle-btn ${!vistaAnual ? 'active' : ''}`}
              onClick={() => setVistaAnual(false)}
            >
              Vista Mensual
            </button>
            <button
              className={`vista-toggle-btn ${vistaAnual ? 'active' : ''}`}
              onClick={() => setVistaAnual(true)}
            >
              Vista Anual
            </button>
          </div>
        )}
        {mostrarFiltro && (
          <div className="date-filter">
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(Number(e.target.value))}
              className="filter-select"
            >
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
            <select
              value={anioFiltro}
              onChange={(e) => setAnioFiltro(Number(e.target.value))}
              className="filter-select"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {vistaAnual ? (
        <VistaAnual anio={anioFiltro} />
      ) : (
        <>
          <div className="hero-summary">
            <div className="hero-card main-summary">
              <div className="hero-header">
                <h2>Resumen del mes</h2>
              </div>
              <div className="hero-stats">
                <div className="hero-stat primary">
                  <div className="hero-stat-label">Total gastado</div>
                  <div className="hero-stat-value">{formatCurrency(estadisticas.totalGastado)}</div>
                </div>
                {presupuestoMensual && (
                  <div className="hero-stat secondary">
                    <div className="hero-stat-label">Disponible del presupuesto</div>
                    <div className={`hero-stat-value ${presupuestoMensual - estadisticas.totalGastado >= 0 ? 'positivo' : 'negativo'}`}>
                      {formatCurrency(Math.abs(presupuestoMensual - estadisticas.totalGastado))}
                    </div>
                  </div>
                )}
              </div>
              <div className="hero-details">
                <div className="hero-detail">
                  <span className="detail-label">vs mes anterior</span>
                  <span className={`detail-value ${resumenMes.variacionMesAnterior > 0 ? 'negativo' : 'positivo'}`}>
                    {resumenMes.variacionMesAnterior > 0 ? '+' : ''}{resumenMes.variacionMesAnterior.toFixed(1)}%
                  </span>
                </div>
                <div className="hero-detail">
                  <span className="detail-label">Fijos pagados</span>
                  <span className="detail-value">{estadisticas.fijosPagados}/{estadisticas.fijosPagados + estadisticas.fijosPendientes}</span>
                </div>
              </div>
            </div>

            <div className="hero-card secondary-card">
              <div className="secondary-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div className="secondary-info">
                <div className="secondary-label">Efectivo disponible</div>
                <div className="secondary-value">{formatCurrency(estadisticas.saldoCaja)}</div>
              </div>
            </div>
          </div>

          {presupuestoMensual && (
            <InteligenciaFinanciera presupuestoMensual={presupuestoMensual} />
          )}

          <div className="section">
            <h2>Gastos del mes</h2>
        <div className="total-gastado-detalle">
          <div className="total-gastado-main">
            <div className="total-label">Total gastado</div>
            <div className="total-monto">{formatCurrency(estadisticas.totalGastado)}</div>
            {presupuestoMensual && (
              <div className="presupuesto-info">
                <div className="presupuesto-bar">
                  <div
                    className="presupuesto-fill"
                    style={{
                      width: `${Math.min((estadisticas.totalGastado / presupuestoMensual) * 100, 100)}%`,
                      backgroundColor: estadisticas.totalGastado > presupuestoMensual ? '#DC3545' : '#4299E1'
                    }}
                  />
                </div>
                <div className="presupuesto-text">
                  {estadisticas.totalGastado > presupuestoMensual ? (
                    <span className="presupuesto-excedido">
                      Excedido por {formatCurrency(estadisticas.totalGastado - presupuestoMensual)}
                    </span>
                  ) : (
                    <span>
                      Disponible: {formatCurrency(presupuestoMensual - estadisticas.totalGastado)} de {formatCurrency(presupuestoMensual)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {gastosPorMedioPago.length > 0 && (
            <div className="breakdown-medios">
              <div className="breakdown-titulo">Breakdown por medio de pago</div>
              <div className="breakdown-items">
                {gastosPorMedioPago.map(item => {
                  const porcentaje = estadisticas.totalGastado > 0
                    ? ((item.monto / estadisticas.totalGastado) * 100).toFixed(1)
                    : '0.0';
                  const icono = item.medio === 'Efectivo' ? '💵' : '📱';

                  return (
                    <div key={item.medio} className="breakdown-item">
                      <div className="breakdown-item-header">
                        <span className="breakdown-icono">{icono}</span>
                        <span className="breakdown-nombre">{item.medio}</span>
                        <span className="breakdown-porcentaje">{porcentaje}%</span>
                      </div>
                      <div className="breakdown-monto">{formatCurrency(item.monto)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

          {gastosPorCategoria.length > 0 && (
            <div className="section chart-section">
              <h2>Gastos por categoría</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    dataKey="monto"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.categoria}: ${((entry.monto / gastosPorCategoria.reduce((sum, g) => sum + g.monto, 0)) * 100).toFixed(0)}%`}
                  >
                    {gastosPorCategoria.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {gastosPorCategoria.length === 0 && (
            <div className="section">
              <h2>Gastos por categoría</h2>
              <div className="empty-state">Sin gastos registrados este mes</div>
            </div>
          )}

          <div className="section chart-section">
            <h2>Evolución mensual</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={evolucionMensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="mes" stroke="#4A5568" />
                <YAxis stroke="#4A5568" />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #E2E8F0' }}
                />
                <Bar dataKey="monto" fill="#2D3748" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {gastosPendientes.length > 0 && (
            <div className="section">
              <h2>Gastos fijos pendientes</h2>
              <div className="pending-list">
                {gastosPendientes.map(gasto => (
                  <div key={gasto.id} className="pending-item">
                    <div className="pending-info">
                      <div className="pending-name">{gasto.plantilla?.nombre}</div>
                      <div className="pending-day">{gasto.plantilla?.dia_pago}</div>
                    </div>
                    <div className="pending-amount">
                      {gasto.plantilla?.monto_estimado
                        ? `~${formatCurrency(gasto.plantilla.monto_estimado)}`
                        : 'Sin estimar'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ultimosMovimientos.length > 0 && (
            <div className="section">
              <h2>Últimos movimientos</h2>
              <div className="movements-list">
                {ultimosMovimientos.map(mov => (
                  <div key={mov.id} className="movement-item">
                    <div className="movement-info">
                      <div className="movement-desc">{mov.descripcion}</div>
                      <div className="movement-meta">
                        {new Date(mov.fecha).toLocaleDateString('es-AR')} • {mov.usuario?.nombre}
                      </div>
                    </div>
                    <div className={`movement-amount ${mov.tipo.toLowerCase()}`}>
                      {mov.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(mov.monto).replace(/^[^0-9-]+/, '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <MesesAnteriores />
        </>
      )}
    </div>
  );
}
