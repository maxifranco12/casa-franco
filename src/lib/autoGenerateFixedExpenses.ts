import { supabase } from './supabase';

export async function autoGenerateMonthlyFixedExpenses(familiaId: string): Promise<number> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: existing } = await supabase
    .from('gastos_fijos_mes')
    .select('id')
    .eq('mes', currentMonth)
    .eq('anio', currentYear)
    .eq('familia_id', familiaId)
    .limit(1);

  if (existing && existing.length > 0) {
    return 0;
  }

  const { data: plantillas } = await supabase
    .from('gastos_fijos_plantilla')
    .select('*')
    .eq('activo', true)
    .eq('familia_id', familiaId);

  if (!plantillas || plantillas.length === 0) {
    return 0;
  }

  const newExpenses = plantillas.map(plantilla => ({
    plantilla_id: plantilla.id,
    mes: currentMonth,
    anio: currentYear,
    estado: 'PENDIENTE',
    monto_real: null,
    fecha_pago: null,
    medio_pago: null,
    registrado_por: null,
    familia_id: familiaId
  }));

  const { error } = await supabase
    .from('gastos_fijos_mes')
    .insert(newExpenses);

  if (error) {
    console.error('Error generating monthly expenses:', error);
    return 0;
  }

  return newExpenses.length;
}
