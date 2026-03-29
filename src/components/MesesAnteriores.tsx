import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { HistorialMes } from '../types';
import { useApp } from '../context/AppContext';
import './MesesAnteriores.css';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function MesesAnteriores() {
  const { currentUser } = useApp();
  const [meses, setMeses] = useState<HistorialMes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.familia_id) {
      cargarHistorial();
    }
  }, [currentUser]);

  async function cargarHistorial() {
    if (!currentUser?.familia_id) return;

    setLoading(true);

    const { data } = await supabase
      .from('historial_meses')
      .select('*')
      .eq('familia_id', currentUser.familia_id)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
      .limit(6);

    if (data) {
      setMeses(data);
    }

    setLoading(false);
  }

  if (loading) {
    return <div className="meses-anteriores-loading">Cargando historial...</div>;
  }

  if (meses.length === 0) {
    return null;
  }

  return (
    <div className="meses-anteriores">
      <h2 className="meses-anteriores-titulo">Meses Anteriores</h2>

      <div className="meses-anteriores-grid">
        {meses.map((mes) => {
          const ahorro = mes.total_ingresado - mes.total_gastado;
          const esDeficit = ahorro < 0;
          const porcentajePresupuesto = mes.presupuesto_asignado
            ? (mes.total_gastado / mes.presupuesto_asignado) * 100
            : null;

          return (
            <div key={mes.id} className="mes-card">
              <div className="mes-card-header">
                <h3>{MESES[mes.mes - 1]} {mes.anio}</h3>
              </div>

              <div className="mes-card-body">
                <div className="mes-stat-principal">
                  <div className="mes-stat-label">Total gastado</div>
                  <div className="mes-stat-valor-grande">
                    {formatCurrency(mes.total_gastado)}
                  </div>
                </div>

                {mes.presupuesto_asignado && (
                  <div className="mes-presupuesto-bar">
                    <div className="mes-presupuesto-info">
                      <span>Presupuesto: {formatCurrency(mes.presupuesto_asignado)}</span>
                      <span className={porcentajePresupuesto && porcentajePresupuesto > 100 ? 'excedido' : ''}>
                        {porcentajePresupuesto?.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mes-presupuesto-barra">
                      <div
                        className={`mes-presupuesto-fill ${porcentajePresupuesto && porcentajePresupuesto > 100 ? 'excedido' : ''}`}
                        style={{ width: `${Math.min(porcentajePresupuesto || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mes-stats-row">
                  <div className="mes-stat">
                    <div className="mes-stat-label">Ingresos</div>
                    <div className="mes-stat-valor">
                      {formatCurrency(mes.total_ingresado)}
                    </div>
                  </div>

                  <div className="mes-stat">
                    <div className="mes-stat-label">{esDeficit ? 'Déficit' : 'Ahorro'}</div>
                    <div className={`mes-stat-valor ${esDeficit ? 'deficit' : 'ahorro'}`}>
                      {formatCurrency(Math.abs(ahorro))}
                    </div>
                  </div>
                </div>

                <div className="mes-stats-row">
                  <div className="mes-stat">
                    <div className="mes-stat-label">Fijos pagados</div>
                    <div className="mes-stat-valor">{mes.fijos_pagados}</div>
                  </div>

                  <div className="mes-stat">
                    <div className="mes-stat-label">Fijos pendientes</div>
                    <div className="mes-stat-valor">{mes.fijos_pendientes}</div>
                  </div>
                </div>

                <div className="mes-stat">
                  <div className="mes-stat-label">Saldo caja al cierre</div>
                  <div className={`mes-stat-valor ${mes.saldo_caja_cierre < 0 ? 'deficit' : ''}`}>
                    {formatCurrency(mes.saldo_caja_cierre)}
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
