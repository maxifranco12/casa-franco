import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './VistaAnual.css';

interface GastoMensual {
  mes: string;
  mesNumero: number;
  monto: number;
}

interface BreakdownAnual {
  medio: string;
  monto: number;
  porcentaje: number;
}

interface VistaAnualProps {
  anio: number;
}

export default function VistaAnual({ anio }: VistaAnualProps) {
  const [gastosMensuales, setGastosMensuales] = useState<GastoMensual[]>([]);
  const [breakdownAnual, setBreakdownAnual] = useState<BreakdownAnual[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    totalAnual: 0,
    promedioMensual: 0,
    mesMaxNombre: '',
    mesMaxMonto: 0,
    mesMinNombre: '',
    mesMinMonto: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatosAnuales();
  }, [anio]);

  async function cargarDatosAnuales() {
    setLoading(true);

    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const meses: GastoMensual[] = [];
    const breakdownPorMedio: { [key: string]: number } = {};
    let totalAnual = 0;

    for (let mes = 1; mes <= 12; mes++) {
      const startDate = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(anio, mes, 0).toISOString().split('T')[0];

      const { data: movimientos } = await supabase
        .from('movimientos')
        .select('monto, medio_pago')
        .eq('tipo', 'EGRESO')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      let totalMes = 0;

      if (movimientos) {
        movimientos.forEach(m => {
          const monto = Number(m.monto);
          totalMes += monto;
          totalAnual += monto;

          if (m.medio_pago) {
            breakdownPorMedio[m.medio_pago] = (breakdownPorMedio[m.medio_pago] || 0) + monto;
          }
        });
      }

      meses.push({
        mes: nombresMeses[mes - 1],
        mesNumero: mes,
        monto: totalMes
      });
    }

    setGastosMensuales(meses);

    const mesesConGastos = meses.filter(m => m.monto > 0);
    const promedioMensual = mesesConGastos.length > 0 ? totalAnual / mesesConGastos.length : 0;

    let mesMax = meses[0];
    let mesMin = meses.find(m => m.monto > 0) || meses[0];

    meses.forEach(m => {
      if (m.monto > mesMax.monto) {
        mesMax = m;
      }
      if (m.monto > 0 && m.monto < mesMin.monto) {
        mesMin = m;
      }
    });

    setEstadisticas({
      totalAnual,
      promedioMensual,
      mesMaxNombre: mesMax.mes,
      mesMaxMonto: mesMax.monto,
      mesMinNombre: mesMin.mes,
      mesMinMonto: mesMin.monto
    });

    const breakdown: BreakdownAnual[] = Object.entries(breakdownPorMedio)
      .map(([medio, monto]) => ({
        medio,
        monto,
        porcentaje: totalAnual > 0 ? (monto / totalAnual) * 100 : 0
      }))
      .sort((a, b) => b.monto - a.monto);

    setBreakdownAnual(breakdown);
    setLoading(false);
  }

  if (loading) {
    return <div className="loading">Cargando datos anuales...</div>;
  }

  return (
    <div className="vista-anual">
      <div className="vista-anual-header">
        <h2>Resumen anual {anio}</h2>
      </div>

      <div className="stats-anual-grid">
        <div className="stat-anual-card total">
          <div className="stat-anual-label">Total gastado</div>
          <div className="stat-anual-valor">{formatCurrency(estadisticas.totalAnual)}</div>
        </div>

        <div className="stat-anual-card promedio">
          <div className="stat-anual-label">Promedio mensual</div>
          <div className="stat-anual-valor">{formatCurrency(estadisticas.promedioMensual)}</div>
        </div>

        <div className="stat-anual-card max">
          <div className="stat-anual-label">Mes con más gasto</div>
          <div className="stat-anual-mes">{estadisticas.mesMaxNombre}</div>
          <div className="stat-anual-valor">{formatCurrency(estadisticas.mesMaxMonto)}</div>
        </div>

        <div className="stat-anual-card min">
          <div className="stat-anual-label">Mes con menos gasto</div>
          <div className="stat-anual-mes">{estadisticas.mesMinNombre}</div>
          <div className="stat-anual-valor">{formatCurrency(estadisticas.mesMinMonto)}</div>
        </div>
      </div>

      <div className="grafico-anual">
        <h3>Gastos mensuales</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={gastosMensuales}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="mes" stroke="#718096" />
            <YAxis stroke="#718096" />
            <Tooltip
              formatter={(value: any) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="monto" fill="#4299E1" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {breakdownAnual.length > 0 && (
        <div className="breakdown-anual">
          <h3>Breakdown anual por medio de pago</h3>
          <div className="breakdown-anual-items">
            {breakdownAnual.map(item => {
              const icono = item.medio === 'Efectivo' ? '💵' : '📱';

              return (
                <div key={item.medio} className="breakdown-anual-item">
                  <div className="breakdown-anual-header">
                    <span className="breakdown-anual-icono">{icono}</span>
                    <span className="breakdown-anual-nombre">{item.medio}</span>
                    <span className="breakdown-anual-porcentaje">{item.porcentaje.toFixed(1)}%</span>
                  </div>
                  <div className="breakdown-anual-bar">
                    <div
                      className="breakdown-anual-fill"
                      style={{ width: `${item.porcentaje}%` }}
                    />
                  </div>
                  <div className="breakdown-anual-monto">{formatCurrency(item.monto)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
