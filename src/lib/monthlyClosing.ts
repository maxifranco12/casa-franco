import { supabase } from './supabase';

export async function closeMonthAndGenerateHistory(familiaId: string): Promise<boolean> {
  const now = new Date();
  const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const { data: existingHistory } = await supabase
    .from('historial_meses')
    .select('id')
    .eq('familia_id', familiaId)
    .eq('mes', lastMonth)
    .eq('anio', lastYear)
    .maybeSingle();

  if (existingHistory) {
    return false;
  }

  const startDate = new Date(lastYear, lastMonth - 1, 1);
  const endDate = new Date(lastYear, lastMonth, 0);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const { data: movimientos } = await supabase
    .from('movimientos')
    .select('tipo, monto, sale_de_caja')
    .eq('familia_id', familiaId)
    .gte('fecha', startDateStr)
    .lte('fecha', endDateStr);

  let totalGastado = 0;
  let totalIngresado = 0;
  let saldoCaja = 0;

  if (movimientos) {
    movimientos.forEach(mov => {
      if (mov.tipo === 'EGRESO') {
        totalGastado += Number(mov.monto);
        if (mov.sale_de_caja) {
          saldoCaja -= Number(mov.monto);
        }
      } else if (mov.tipo === 'INGRESO') {
        totalIngresado += Number(mov.monto);
        if (mov.sale_de_caja) {
          saldoCaja += Number(mov.monto);
        }
      }
    });
  }

  const { data: gastosFijos } = await supabase
    .from('gastos_fijos_mes')
    .select('estado, monto_real')
    .eq('familia_id', familiaId)
    .eq('mes', lastMonth)
    .eq('anio', lastYear);

  let fijosPagados = 0;
  let fijosPendientes = 0;

  if (gastosFijos) {
    gastosFijos.forEach(gasto => {
      if (gasto.estado === 'PAGADO') {
        fijosPagados++;
        if (gasto.monto_real) {
          totalGastado += Number(gasto.monto_real);
        }
      } else {
        fijosPendientes++;
      }
    });
  }

  const { data: presupuestoConfig } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'presupuesto_mensual')
    .eq('familia_id', familiaId)
    .maybeSingle();

  const presupuestoAsignado = presupuestoConfig?.valor ? Number(presupuestoConfig.valor) : null;

  const { error } = await supabase
    .from('historial_meses')
    .insert({
      familia_id: familiaId,
      mes: lastMonth,
      anio: lastYear,
      total_gastado: totalGastado,
      total_ingresado: totalIngresado,
      saldo_caja_cierre: saldoCaja,
      fijos_pagados: fijosPagados,
      fijos_pendientes: fijosPendientes,
      presupuesto_asignado: presupuestoAsignado
    });

  if (error) {
    console.error('Error creating monthly history:', error);
    return false;
  }

  return true;
}
