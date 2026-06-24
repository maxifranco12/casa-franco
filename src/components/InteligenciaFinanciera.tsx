import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { animateCounter } from '../lib/animatedCounter';
import { formatCurrency } from '../lib/currency';
import './InteligenciaFinanciera.css';

interface Props {
  presupuestoMensual: number;
}

export default function InteligenciaFinanciera({ presupuestoMensual }: Props) {
  const [gastosFijos, setGastosFijos] = useState(0);
  const [gastosVariables, setGastosVariables] = useState(0);
  const [gastoMesAnterior, setGastoMesAnterior] = useState(0);
  const [loading, setLoading] = useState(true);

  const gastadoRef = useRef<HTMLSpanElement>(null);
  const disponibleRef = useRef<HTMLSpanElement>(null);
  const ahorroRef = useRef<HTMLSpanElement>(null);
  const proyeccionRef = useRef<HTMLSpanElement>(null);
  const ahorro6mesesRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const mesActual = new Date().toISOString().slice(0, 7);
    const fechaInicio = `${mesActual}-01`;
    const fechaFin = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString().split('T')[0];

    const mesAnterior = new Date();
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    const mesAnteriorStr = mesAnterior.toISOString().slice(0, 7);
    const fechaInicioAnterior = `${mesAnteriorStr}-01`;
    const fechaFinAnterior = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 0)
      .toISOString().split('T')[0];

    const { data: fijosPagados } = await supabase
      .from('historial_pagos_gastos_fijos')
      .select('monto')
      .gte('fecha_pago', fechaInicio)
      .lte('fecha_pago', fechaFin);

    const { data: variablesData } = await supabase
      .from('movimientos')
      .select('monto, categoria')
      .eq('tipo', 'EGRESO')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    const { data: mesAnteriorData } = await supabase
      .from('movimientos')
      .select('monto')
      .eq('tipo', 'EGRESO')
      .gte('fecha', fechaInicioAnterior)
      .lte('fecha', fechaFinAnterior);

    const { data: fijosAnterior } = await supabase
      .from('historial_pagos_gastos_fijos')
      .select('monto')
      .gte('fecha_pago', fechaInicioAnterior)
      .lte('fecha_pago', fechaFinAnterior);

    const totalFijos = fijosPagados?.reduce((sum, p) => sum + Number(p.monto), 0) || 0;
    const totalVariables = variablesData?.reduce((sum, m) => sum + Number(m.monto), 0) || 0;

    const totalAnteriorVariables = mesAnteriorData?.reduce((sum, m) => sum + Number(m.monto), 0) || 0;
    const totalAnteriorFijos = fijosAnterior?.reduce((sum, p) => sum + Number(p.monto), 0) || 0;

    setGastosFijos(totalFijos);
    setGastosVariables(totalVariables);
    setGastoMesAnterior(totalAnteriorVariables + totalAnteriorFijos);
    setLoading(false);

    setTimeout(() => {
      const totalGastado = totalFijos + totalVariables;
      const disponible = presupuestoMensual - totalGastado;
      const ahorro = disponible >= 0 ? disponible : 0;
      const promedioMensual = totalGastado;
      const proyeccionAnual = promedioMensual * 12;
      const ahorro6Meses = ahorro * 6;

      if (gastadoRef.current) {
        animateCounter(gastadoRef.current, totalGastado, 1200);
      }
      if (disponibleRef.current) {
        animateCounter(disponibleRef.current, Math.abs(disponible), 1200);
      }
      if (ahorroRef.current) {
        animateCounter(ahorroRef.current, Math.abs(disponible), 1200);
      }
      if (proyeccionRef.current) {
        animateCounter(proyeccionRef.current, proyeccionAnual, 1200);
      }
      if (ahorro6mesesRef.current) {
        animateCounter(ahorro6mesesRef.current, Math.max(0, ahorro6Meses), 1200);
      }
    }, 100);
  }

  if (loading) {
    return null;
  }

  const totalGastado = gastosFijos + gastosVariables;
  const porcentajeUsado = (totalGastado / presupuestoMensual) * 100;
  const disponible = presupuestoMensual - totalGastado;
  const ahorro = disponible;
  const diferenciaMesAnterior = totalGastado - gastoMesAnterior;
  const porcentajeCambio = gastoMesAnterior > 0
    ? ((diferenciaMesAnterior / gastoMesAnterior) * 100).toFixed(1)
    : '0';

  let colorTermometro = '#38A169';
  let estadoTexto = 'Excelente';
  if (porcentajeUsado > 90) {
    colorTermometro = '#E53E3E';
    estadoTexto = 'Crítico';
  } else if (porcentajeUsado > 70) {
    colorTermometro = '#ED8936';
    estadoTexto = 'Atención';
  } else if (porcentajeUsado > 50) {
    colorTermometro = '#ECC94B';
    estadoTexto = 'Moderado';
  }

  const mesesAhorrando = ahorro > 0 ? calcularRachaAhorro() : 0;

  function calcularRachaAhorro(): number {
    return 1;
  }

  return (
    <div className="inteligencia-financiera">
      <h2 className="if-titulo">Inteligencia Financiera</h2>

      <div className="if-grid">
        <div className="if-card termometro-card">
          <div className="card-header">
            <h3>Salud Financiera</h3>
            <span className={`estado-badge ${estadoTexto.toLowerCase()}`}>{estadoTexto}</span>
          </div>

          <div className="termometro-visual">
            <div className="termometro-barra">
              <div
                className="termometro-fill"
                style={{
                  width: `${Math.min(porcentajeUsado, 100)}%`,
                  backgroundColor: colorTermometro
                }}
              />
            </div>
            <div className="termometro-info">
              <span className="porcentaje">{Math.round(porcentajeUsado)}%</span>
              <span className="texto-secundario">del presupuesto</span>
            </div>
          </div>

          <div className="stats-row-new">
            <div className="stat-item-primary">
              <span className="stat-label-primary">Gastado</span>
              <span className="stat-value-primary" ref={gastadoRef}>$0</span>
            </div>
            <div className="stat-item-secondary">
              <span className="stat-label-secondary">Resto del presupuesto ideal</span>
              <span className="stat-sublabel">(no es la plata real en caja)</span>
              <span className="stat-value-secondary" ref={disponibleRef}>$0</span>
            </div>
          </div>
        </div>

        <div className={`if-card ahorro-card ${ahorro < 0 ? 'negativo' : 'positivo'}`}>
          <div className="ahorro-header">
            <span className="ahorro-icon">{ahorro >= 0 ? '💰' : '⚠️'}</span>
            <h3>{ahorro >= 0 ? 'Ahorro del mes' : 'Te pasaste del presupuesto'}</h3>
          </div>

          <div className="ahorro-monto">
            <span ref={ahorroRef}>$0</span>
          </div>

          {gastoMesAnterior > 0 && (
            <div className="comparacion-mes">
              <span className={`flecha ${diferenciaMesAnterior > 0 ? 'subida' : 'bajada'}`}>
                {diferenciaMesAnterior > 0 ? '↑' : '↓'}
              </span>
              <span>{Math.abs(Number(porcentajeCambio))}% vs mes anterior</span>
            </div>
          )}
        </div>

        <div className="if-card racha-card">
          <div className="racha-content">
            {ahorro >= 0 ? (
              <>
                <div className="racha-emoji">
                  {mesesAhorrando >= 3 ? '🔥🔥' : mesesAhorrando >= 2 ? '🔥' : '✅'}
                </div>
                <p className="racha-texto">
                  {mesesAhorrando >= 3
                    ? `¡Racha de ${mesesAhorrando} meses! Siguen así!`
                    : mesesAhorrando >= 2
                    ? `${mesesAhorrando} meses ahorrando seguidos!`
                    : '¡Buen mes!'}
                </p>
              </>
            ) : (
              <>
                <div className="racha-emoji">💪</div>
                <p className="racha-texto">¡El mes que viene lo recuperamos!</p>
              </>
            )}
          </div>
        </div>

        <div className="if-card proyeccion-card">
          <h3>Proyección anual</h3>

          <div className="proyeccion-item">
            <span className="proyeccion-icon">📈</span>
            <div className="proyeccion-info">
              <span className="proyeccion-label">A este ritmo, este año gastarán</span>
              <span className="proyeccion-valor" ref={proyeccionRef}>$0</span>
            </div>
          </div>

          {ahorro > 0 && (
            <div className="proyeccion-item positiva">
              <span className="proyeccion-icon">🚀</span>
              <div className="proyeccion-info">
                <span className="proyeccion-label">En 6 meses ahorrarán</span>
                <span className="proyeccion-valor" ref={ahorro6mesesRef}>$0</span>
              </div>
            </div>
          )}

          {ahorro < 0 && (
            <div className="proyeccion-item negativa">
              <span className="proyeccion-icon">⚠️</span>
              <div className="proyeccion-info">
                <span className="proyeccion-label">Este año se pasarán</span>
                <span className="proyeccion-valor">{formatCurrency(Math.abs(ahorro) * 12)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
