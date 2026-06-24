import { supabase } from './supabase';

export async function calcularTotalGastadoMes(mes: number, anio: number) {
  const startDate = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(anio, mes, 0).toISOString().split('T')[0];

  const { data: movimientos } = await supabase
    .from('movimientos')
    .select('monto')
    .eq('tipo', 'EGRESO')
    .gte('fecha', startDate)
    .lte('fecha', endDate);

  const { data: fijosPagados } = await supabase
    .from('historial_pagos_gastos_fijos')
    .select('monto')
    .gte('fecha_pago', startDate)
    .lte('fecha_pago', endDate);

  const totalMovimientos = movimientos?.reduce((sum, m) => sum + Number(m.monto), 0) || 0;
  const totalFijos = fijosPagados?.reduce((sum, p) => sum + Number(p.monto), 0) || 0;

  return totalMovimientos + totalFijos;
}
