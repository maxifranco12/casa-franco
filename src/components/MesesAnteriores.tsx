import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { calcularTotalGastadoMes } from '../lib/calculos';
import './MesesAnteriores.css';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface MesData {
  mes: number;
  anio: number;
  totalGastado: number;
  totalIngresos: number;
  ahorro: number;
  fijosPagados: number;
  fijosPendientes: number;
}

export default function MesesAnteriores() {
  const [meses, setMeses] = useState<MesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarMeses();
  }, []);

  async function cargarMeses() {
    setLoading(true);

    const now = new Date();
    const resultados: MesData[] = [];

    for (let i = 1; i <= 6; i++) {
      const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mes = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();

      const startDate = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(anio, mes, 0).toISOString().split('T')[0];

      const [totalGastado, ingresosRes, fijosRes] = await Promise.all([
        calcularTotalGastadoMes(mes, anio),
        supabase
          .from('movimientos')
          .select('monto')
          .eq('tipo', 'INGRESO')
          .gte('fecha', startDate)
          .lte('fecha', endDate),
        supabase
          .from('gastos_fijos_mes')
          .select('estado')
          .eq('mes', mes)
          .eq('anio', anio)
      ]);

      const totalIngresos = ingresosRes.data?.reduce((s, m) => s + Number(m.monto), 0) || 0;
      let fijosPagados = 0;
      let fijosPendientes = 0;
      if (fijosRes.data) {
        fijosRes.data.forEach(f => {
          if (f.estado === 'PAGADO') fijosPagados++;
          else fijosPendientes++;
        });
      }

      resultados.push({
        mes,
        anio,
        totalGastado,
        totalIngresos,
        ahorro: totalIngresos - totalGastado,
        fijosPagados,
        fijosPendientes
      });
    }

    setMeses(resultados);
    setLoading(false);
  }

  if (loading) {
    return <div className="meses-anteriores-loading">Cargando historial...</div>;
  }

  const mesesConDatos = meses.filter(m => m.totalGastado > 0 || m.totalIngresos > 0);

  if (mesesConDatos.length === 0) {
    return null;
  }

  return (
    <div className="meses-anteriores">
      <h2 className="meses-anteriores-titulo">Meses Anteriores</h2>

      <div className="meses-anteriores-grid">
        {mesesConDatos.map((m) => {
          const esDeficit = m.ahorro < 0;

          return (
            <div key={`${m.mes}-${m.anio}`} className="mes-card">
              <div className="mes-card-header">
                <h3>{MESES[m.mes - 1]} {m.anio}</h3>
              </div>

              <div className="mes-card-body">
                <div className="mes-stat-principal">
                  <div className="mes-stat-label">Total gastado</div>
                  <div className="mes-stat-valor-grande">
                    {formatCurrency(m.totalGastado)}
                  </div>
                </div>

                <div className="mes-stats-row">
                  <div className="mes-stat">
                    <div className="mes-stat-label">Ingresos</div>
                    <div className="mes-stat-valor">
                      {formatCurrency(m.totalIngresos)}
                    </div>
                  </div>

                  <div className="mes-stat">
                    <div className="mes-stat-label">{esDeficit ? 'Deficit' : 'Ahorro'}</div>
                    <div className={`mes-stat-valor ${esDeficit ? 'deficit' : 'ahorro'}`}>
                      {formatCurrency(Math.abs(m.ahorro))}
                    </div>
                  </div>
                </div>

                <div className="mes-stats-row">
                  <div className="mes-stat">
                    <div className="mes-stat-label">Fijos pagados</div>
                    <div className="mes-stat-valor">{m.fijosPagados}</div>
                  </div>

                  <div className="mes-stat">
                    <div className="mes-stat-label">Fijos pendientes</div>
                    <div className="mes-stat-valor">{m.fijosPendientes}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
