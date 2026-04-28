import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { Movimiento, GastoFijoMes, GastoFijoPlantilla } from '../types';
import { calcularTotalGastadoMes } from '../lib/calculos';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import './Informe.css';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const COLORES_CATEGORIAS = ['#2D3748', '#4A5568', '#718096', '#A0AEC0', '#CBD5E0', '#E53E3E', '#DD6B20', '#D69E2E', '#38A169', '#319795', '#3182CE'];

type Periodo = 'mes' | 'semana';

interface CategoriaData {
  categoria: string;
  monto: number;
  porcentaje: number;
}

interface GastoPorPersona {
  nombre: string;
  monto: number;
}

interface DailyData {
  dia: number;
  monto: number;
}

export default function Informe() {
  const navigate = useNavigate();
  const { users } = useApp();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [loading, setLoading] = useState(true);
  const [mes] = useState(new Date().getMonth() + 1);
  const [anio] = useState(new Date().getFullYear());

  const [totalGastado, setTotalGastado] = useState(0);
  const [presupuestoMensual, setPresupuestoMensual] = useState<number | null>(null);
  const [variacionMesAnterior, setVariacionMesAnterior] = useState(0);
  const [totalMesAnterior, setTotalMesAnterior] = useState(0);
  const [categoriasData, setCategoriasData] = useState<CategoriaData[]>([]);
  const [fijosMes, setFijosMes] = useState<GastoFijoMes[]>([]);
  const [_fijosPlantilla, setFijosPlantilla] = useState<GastoFijoPlantilla[]>([]);
  const [gastosPorPersona, setGastosPorPersona] = useState<GastoPorPersona[]>([]);
  const [top5Gastos, setTop5Gastos] = useState<Movimiento[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [detalleExpandido, setDetalleExpandido] = useState(false);

  const nombreMes = MESES[mes - 1];
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const startDate = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(anio, mes, 0).toISOString().split('T')[0];

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  async function cargarDatos() {
    setLoading(true);

    const effectiveStart = periodo === 'semana'
      ? getStartOfLastWeek()
      : startDate;

    await Promise.all([
      cargarTotalGastado(effectiveStart),
      cargarPresupuesto(),
      cargarVariacion(),
      cargarCategorias(effectiveStart),
      cargarFijos(),
      cargarGastosPorPersona(effectiveStart),
      cargarTop5(effectiveStart),
      cargarEvolucionDiaria(effectiveStart),
      cargarMovimientos(effectiveStart)
    ]);

    setLoading(false);
  }

  function getStartOfLastWeek(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }

  async function cargarTotalGastado(effectiveStart: string) {
    if (periodo === 'mes') {
      const total = await calcularTotalGastadoMes(mes, anio);
      setTotalGastado(total);
    } else {
      const { data: movs } = await supabase
        .from('movimientos')
        .select('monto')
        .eq('tipo', 'EGRESO')
        .gte('fecha', effectiveStart)
        .lte('fecha', endDate);
      const { data: fijosPag } = await supabase
        .from('historial_pagos_gastos_fijos')
        .select('monto')
        .gte('fecha_pago', effectiveStart)
        .lte('fecha_pago', endDate);
      const t1 = movs?.reduce((s, m) => s + Number(m.monto), 0) || 0;
      const t2 = fijosPag?.reduce((s, p) => s + Number(p.monto), 0) || 0;
      setTotalGastado(t1 + t2);
    }
  }

  async function cargarPresupuesto() {
    const { data } = await supabase
      .from('configuracion')
      .select('presupuesto_mensual')
      .eq('clave', 'foto_inicio')
      .maybeSingle();
    if (data?.presupuesto_mensual) {
      setPresupuestoMensual(Number(data.presupuesto_mensual));
    }
  }

  async function cargarVariacion() {
    const mesAnt = mes === 1 ? 12 : mes - 1;
    const anioAnt = mes === 1 ? anio - 1 : anio;
    const totalAnt = await calcularTotalGastadoMes(mesAnt, anioAnt);
    setTotalMesAnterior(totalAnt);
    if (totalAnt > 0) {
      setVariacionMesAnterior(((totalGastado - totalAnt) / totalAnt) * 100);
    }
  }

  async function cargarCategorias(effectiveStart: string) {
    const { data } = await supabase
      .from('movimientos')
      .select('categoria, monto')
      .eq('tipo', 'EGRESO')
      .gte('fecha', effectiveStart)
      .lte('fecha', endDate)
      .not('categoria', 'is', null);

    if (data && data.length > 0) {
      const agrupados: Record<string, number> = {};
      data.forEach(m => {
        if (m.categoria) {
          agrupados[m.categoria] = (agrupados[m.categoria] || 0) + Number(m.monto);
        }
      });
      const total = Object.values(agrupados).reduce((a, b) => a + b, 0);
      const resultado = Object.entries(agrupados)
        .map(([cat, monto]) => ({
          categoria: cat,
          monto,
          porcentaje: total > 0 ? (monto / total) * 100 : 0
        }))
        .sort((a, b) => b.monto - a.monto);
      setCategoriasData(resultado);
    } else {
      setCategoriasData([]);
    }
  }

  async function cargarFijos() {
    const { data: fijos } = await supabase
      .from('gastos_fijos_mes')
      .select(`*, plantilla:gastos_fijos_plantilla(*)`)
      .eq('mes', mes)
      .eq('anio', anio)
      .order('created_at');
    if (fijos) setFijosMes(fijos);

    const { data: plantillas } = await supabase
      .from('gastos_fijos_plantilla')
      .select('*')
      .eq('activo', true);
    if (plantillas) setFijosPlantilla(plantillas);
  }

  async function cargarGastosPorPersona(effectiveStart: string) {
    const { data } = await supabase
      .from('movimientos')
      .select('quien_pago, monto')
      .eq('tipo', 'EGRESO')
      .gte('fecha', effectiveStart)
      .lte('fecha', endDate);

    if (data) {
      const porPersona: Record<string, number> = {};
      data.forEach(m => {
        const userId = m.quien_pago || 'desconocido';
        porPersona[userId] = (porPersona[userId] || 0) + Number(m.monto);
      });
      const resultado = Object.entries(porPersona).map(([userId, monto]) => {
        const user = users.find(u => u.id === userId);
        return { nombre: user?.nombre || 'Desconocido', monto };
      }).sort((a, b) => b.monto - a.monto);
      setGastosPorPersona(resultado);
    }
  }

  async function cargarTop5(effectiveStart: string) {
    const { data } = await supabase
      .from('movimientos')
      .select(`*, usuario:registrado_por(nombre)`)
      .eq('tipo', 'EGRESO')
      .gte('fecha', effectiveStart)
      .lte('fecha', endDate)
      .order('monto', { ascending: false })
      .limit(5);
    if (data) setTop5Gastos(data);
  }

  async function cargarEvolucionDiaria(effectiveStart: string) {
    const { data } = await supabase
      .from('movimientos')
      .select('fecha, monto')
      .eq('tipo', 'EGRESO')
      .gte('fecha', effectiveStart)
      .lte('fecha', endDate);

    if (data) {
      const porDia: Record<number, number> = {};
      data.forEach(m => {
        const dia = new Date(m.fecha).getDate();
        porDia[dia] = (porDia[dia] || 0) + Number(m.monto);
      });
      const startDay = periodo === 'semana' ? parseInt(effectiveStart.split('-')[2]) : 1;
      const endDay = periodo === 'semana' ? new Date().getDate() : diasEnMes;
      const resultado: DailyData[] = [];
      for (let d = startDay; d <= endDay; d++) {
        resultado.push({ dia: d, monto: porDia[d] || 0 });
      }
      setDailyData(resultado);
    }
  }

  async function cargarMovimientos(effectiveStart: string) {
    const { data } = await supabase
      .from('movimientos')
      .select(`*, usuario:registrado_por(nombre)`)
      .eq('tipo', 'EGRESO')
      .gte('fecha', effectiveStart)
      .lte('fecha', endDate)
      .order('fecha', { ascending: false });
    if (data) setMovimientos(data);
  }

  function handlePrint() {
    window.print();
  }

  function handleWhatsApp() {
    const diff = presupuestoMensual ? presupuestoMensual - totalGastado : 0;
    const diffText = diff >= 0
      ? `Ahorraron ${formatCurrency(diff)}`
      : `Se pasaron por ${formatCurrency(Math.abs(diff))}`;
    const catLider = categoriasData[0];
    const texto = `Casa Franco - Informe ${nombreMes} ${anio}\n\n` +
      `Total gastado: ${formatCurrency(totalGastado)}\n` +
      (presupuestoMensual ? `Presupuesto: ${formatCurrency(presupuestoMensual)}\n${diffText}\n` : '') +
      (catLider ? `Categoría líder: ${catLider.categoria} (${formatCurrency(catLider.monto)})\n` : '') +
      (variacionMesAnterior !== 0 ? `vs mes anterior: ${variacionMesAnterior > 0 ? '+' : ''}${variacionMesAnterior.toFixed(1)}%\n` : '') +
      `\nGenerado con Casa Franco`;
    const encoded = encodeURIComponent(texto);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  const presupuestoUsado = presupuestoMensual ? Math.min((totalGastado / presupuestoMensual) * 100, 100) : 0;
  const diferencia = presupuestoMensual ? presupuestoMensual - totalGastado : 0;
  const fijosPagados = fijosMes.filter(f => f.estado === 'PAGADO').length;
  const fijosPendientes = fijosMes.filter(f => f.estado === 'PENDIENTE').length;
  const totalFijos = fijosMes.reduce((s, f) => s + (Number(f.monto_real) || Number(f.plantilla?.monto_estimado) || 0), 0);
  const diaMasGasto = dailyData.reduce((max, d) => d.monto > max.monto ? d : max, { dia: 0, monto: 0 });
  const promedioDiario = dailyData.length > 0 ? totalGastado / dailyData.filter(d => d.monto > 0).length : 0;

  if (loading) {
    return <div className="informe-loading">Generando informe...</div>;
  }

  return (
    <div className="informe">
      <div className="informe-toolbar no-print">
        <button className="informe-back-btn" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver al Tablero
        </button>
        <div className="informe-toolbar-right">
          <div className="periodo-toggle">
            <button
              className={`periodo-btn ${periodo === 'mes' ? 'active' : ''}`}
              onClick={() => setPeriodo('mes')}
            >
              Mes completo
            </button>
            <button
              className={`periodo-btn ${periodo === 'semana' ? 'active' : ''}`}
              onClick={() => setPeriodo('semana')}
            >
              Ultima semana
            </button>
          </div>
          <button className="informe-action-btn pdf" onClick={handlePrint}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            PDF
          </button>
          <button className="informe-action-btn whatsapp" onClick={handleWhatsApp}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.294-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.553 4.127 1.52 5.86L0 24l6.336-1.652A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.97 0-3.834-.524-5.453-1.438l-.39-.232-4.042 1.052 1.078-3.94-.254-.404A9.72 9.72 0 0 1 2.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
            </svg>
            WhatsApp
          </button>
        </div>
      </div>

      <div className="informe-content">
        <header className="informe-header">
          <h1>Casa Franco - Informe {nombreMes} {anio}</h1>
          <p className="informe-periodo">
            Periodo: 1 al {diasEnMes} de {nombreMes.toLowerCase()} {anio}
          </p>
        </header>

        <section className="informe-section">
          <h2 className="section-title">Resumen Ejecutivo</h2>
          <div className="resumen-grid">
            <div className="resumen-card main">
              <div className="resumen-label">Total gastado</div>
              <div className="resumen-value big">{formatCurrency(totalGastado)}</div>
            </div>
            {presupuestoMensual && (
              <>
                <div className="resumen-card">
                  <div className="resumen-label">Presupuesto mensual</div>
                  <div className="resumen-value">{formatCurrency(presupuestoMensual)}</div>
                </div>
                <div className="resumen-card">
                  <div className="resumen-label">{diferencia >= 0 ? 'Ahorraron' : 'Se pasaron por'}</div>
                  <div className={`resumen-value ${diferencia >= 0 ? 'positivo' : 'negativo'}`}>
                    {formatCurrency(Math.abs(diferencia))}
                  </div>
                </div>
                <div className="resumen-card progress-card">
                  <div className="resumen-label">% del presupuesto usado</div>
                  <div className="circular-progress">
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#E2E8F0" strokeWidth="8"/>
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={presupuestoUsado > 100 ? '#E53E3E' : '#2D3748'}
                        strokeWidth="8"
                        strokeDasharray={`${presupuestoUsado * 2.51} 251`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <span className="progress-text">{presupuestoUsado.toFixed(0)}%</span>
                  </div>
                </div>
              </>
            )}
            <div className="resumen-card">
              <div className="resumen-label">vs mes anterior</div>
              <div className={`resumen-value ${variacionMesAnterior > 0 ? 'negativo' : 'positivo'}`}>
                {variacionMesAnterior > 0 ? '+' : ''}{variacionMesAnterior.toFixed(1)}%
                <span className="arrow">{variacionMesAnterior > 0 ? '↑' : '↓'}</span>
              </div>
              <div className="resumen-sub">{formatCurrency(totalMesAnterior)} el mes pasado</div>
            </div>
          </div>
        </section>

        <section className="informe-section page-break">
          <h2 className="section-title">Breakdown por Categoria</h2>
          {categoriasData.length > 0 ? (
            <div className="categorias-breakdown">
              <div className="categorias-chart">
                <ResponsiveContainer width="100%" height={categoriasData.length * 40 + 20}>
                  <BarChart data={categoriasData} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false}/>
                    <XAxis type="number" stroke="#4A5568" tickFormatter={(v: any) => formatCurrency(Number(v))}/>
                    <YAxis type="category" dataKey="categoria" stroke="#4A5568" width={80} tick={{ fontSize: 12 }}/>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))}/>
                    <Bar dataKey="monto" radius={[0, 4, 4, 0]}>
                      {categoriasData.map((_, i) => (
                        <Cell key={i} fill={COLORES_CATEGORIAS[i % COLORES_CATEGORIAS.length]}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="categorias-table">
                {categoriasData.map((cat, i) => (
                  <div key={cat.categoria} className="cat-row">
                    <div className="cat-color" style={{ background: COLORES_CATEGORIAS[i % COLORES_CATEGORIAS.length] }}/>
                    <div className="cat-name">{cat.categoria}</div>
                    <div className="cat-amount">{formatCurrency(cat.monto)}</div>
                    <div className="cat-pct">{cat.porcentaje.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="no-data">Sin datos de categorias</p>
          )}
        </section>

        <section className="informe-section page-break">
          <h2 className="section-title">Gastos Fijos</h2>
          <div className="fijos-summary">
            <div className="fijos-stat">
              <span className="fijos-stat-label">Pagados</span>
              <span className="fijos-stat-value pagado">{fijosPagados}</span>
            </div>
            <div className="fijos-stat">
              <span className="fijos-stat-label">Pendientes</span>
              <span className="fijos-stat-value pendiente">{fijosPendientes}</span>
            </div>
            <div className="fijos-stat">
              <span className="fijos-stat-label">Total monto</span>
              <span className="fijos-stat-value">{formatCurrency(totalFijos)}</span>
            </div>
          </div>
          {fijosMes.length > 0 ? (
            <div className="fijos-table-wrapper">
              <table className="fijos-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Monto estimado</th>
                    <th>Monto pagado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {fijosMes.map(f => (
                    <tr key={f.id}>
                      <td>{f.plantilla?.nombre || '-'}</td>
                      <td>{f.plantilla?.monto_estimado ? formatCurrency(f.plantilla.monto_estimado) : '-'}</td>
                      <td>{f.monto_real ? formatCurrency(f.monto_real) : '-'}</td>
                      <td>
                        <span className={`estado-badge ${f.estado.toLowerCase()}`}>{f.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">No hay gastos fijos registrados</p>
          )}
        </section>

        <section className="informe-section page-break">
          <h2 className="section-title">Quien Gasto Mas</h2>
          {gastosPorPersona.length > 0 ? (
            <div className="persona-comparison">
              <div className="persona-bars">
                {gastosPorPersona.map((p, i) => {
                  const maxMonto = gastosPorPersona[0]?.monto || 1;
                  const pct = (p.monto / maxMonto) * 100;
                  const totalPersona = gastosPorPersona.reduce((s, x) => s + x.monto, 0);
                  const sharePct = totalPersona > 0 ? (p.monto / totalPersona) * 100 : 0;
                  return (
                    <div key={p.nombre} className="persona-row">
                      <div className="persona-name">{p.nombre}</div>
                      <div className="persona-bar-container">
                        <div
                          className="persona-bar"
                          style={{
                            width: `${pct}%`,
                            background: i === 0 ? '#2D3748' : '#718096'
                          }}
                        />
                      </div>
                      <div className="persona-amount">{formatCurrency(p.monto)}</div>
                      <div className="persona-pct">{sharePct.toFixed(0)}%</div>
                    </div>
                  );
                })}
              </div>
              {gastosPorPersona.length >= 2 && (
                <div className="persona-pie">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={gastosPorPersona.map(p => ({ name: p.nombre, value: p.monto }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#2D3748"/>
                        <Cell fill="#718096"/>
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <p className="no-data">Sin datos</p>
          )}
        </section>

        <section className="informe-section page-break">
          <h2 className="section-title">Top 5 Gastos</h2>
          {top5Gastos.length > 0 ? (
            <div className="top5-list">
              {top5Gastos.map((g, i) => (
                <div key={g.id} className="top5-item">
                  <div className="top5-rank">{i + 1}</div>
                  <div className="top5-info">
                    <div className="top5-desc">{g.descripcion}</div>
                    <div className="top5-meta">
                      {new Date(g.fecha).toLocaleDateString('es-AR')}
                      {g.categoria && ` | ${g.categoria}`}
                      {g.usuario?.nombre && ` | ${g.usuario.nombre}`}
                    </div>
                  </div>
                  <div className="top5-amount">{formatCurrency(g.monto)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">Sin gastos registrados</p>
          )}
        </section>

        <section className="informe-section page-break">
          <h2 className="section-title">Evolucion Diaria</h2>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/>
                <XAxis dataKey="dia" stroke="#4A5568" label={{ value: 'Dia', position: 'insideBottom', offset: -5 }}/>
                <YAxis stroke="#4A5568" tickFormatter={(v: any) => formatCurrency(Number(v))}/>
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} labelFormatter={(label: any) => `Dia ${label}`}/>
                <Line type="monotone" dataKey="monto" stroke="#2D3748" strokeWidth={2} dot={{ r: 3 }}/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">Sin datos diarios</p>
          )}
        </section>

        <section className="informe-section page-break">
          <h2 className="section-title">
            Detalle Completo
            <button
              className="expand-toggle no-print"
              onClick={() => setDetalleExpandido(!detalleExpandido)}
            >
              {detalleExpandido ? 'Contraer' : 'Expandir todo'}
            </button>
          </h2>
          {movimientos.length > 0 ? (
            <div className={`detalle-table-wrapper ${detalleExpandido ? 'expanded' : ''}`}>
              <table className="detalle-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripcion</th>
                    <th>Categoria</th>
                    <th>Quien pago</th>
                    <th>Medio</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(m => (
                    <tr key={m.id}>
                      <td>{new Date(m.fecha).toLocaleDateString('es-AR')}</td>
                      <td>{m.descripcion}</td>
                      <td>{m.categoria || '-'}</td>
                      <td>{m.usuario?.nombre || '-'}</td>
                      <td>{m.medio_pago}</td>
                      <td className="monto-cell">{formatCurrency(m.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">Sin movimientos</p>
          )}
        </section>

        <section className="informe-section page-break">
          <h2 className="section-title">Insights</h2>
          <div className="insights-list">
            {categoriasData.length > 0 && (
              <div className="insight-item">
                <span className="insight-bullet">•</span>
                El gasto mas fuerte fue <strong>{categoriasData[0].categoria}</strong> con {formatCurrency(categoriasData[0].monto)}
              </div>
            )}
            {variacionMesAnterior !== 0 && (
              <div className="insight-item">
                <span className="insight-bullet">•</span>
                Gastaron {Math.abs(variacionMesAnterior).toFixed(1)}% {variacionMesAnterior > 0 ? 'mas' : 'menos'} que el mes anterior
              </div>
            )}
            {diaMasGasto.dia > 0 && diaMasGasto.monto > 0 && (
              <div className="insight-item">
                <span className="insight-bullet">•</span>
                El dia que mas gastaron fue el {diaMasGasto.dia} de {nombreMes.toLowerCase()} con {formatCurrency(diaMasGasto.monto)}
              </div>
            )}
            {promedioDiario > 0 && (
              <div className="insight-item">
                <span className="insight-bullet">•</span>
                Promedio diario: {formatCurrency(promedioDiario)}
              </div>
            )}
          </div>
        </section>

        <footer className="informe-footer">
          <p>Generado con Casa Franco</p>
          <p className="footer-date">{new Date().toLocaleString('es-AR')}</p>
        </footer>
      </div>
    </div>
  );
}
