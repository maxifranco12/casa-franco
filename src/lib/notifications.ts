export async function scheduleDailyReminder() {
  if (!('Notification' in window)) return;

  if (Notification.permission !== 'granted') {
    return;
  }

  const checkAndNotify = async () => {
    const now = new Date();
    const hour = now.getHours();

    if (hour === 21) {
      const { supabase } = await import('./supabase');

      const hoy = new Date();
      const enTresDias = new Date(hoy);
      enTresDias.setDate(enTresDias.getDate() + 3);

      const diaLimite = enTresDias.getDate();

      const { data: gastos } = await supabase
        .from('gastos_fijos_plantilla')
        .select('nombre, dia_vencimiento')
        .eq('activo', true)
        .not('dia_vencimiento', 'is', null);

      if (gastos) {
        const proximosVencer = gastos.filter(g => {
          const diaVenc = g.dia_vencimiento!;
          return diaVenc <= diaLimite;
        });

        if (proximosVencer.length > 0) {
          new Notification('Casa Franco - Gastos próximos a vencer', {
            body: `Tenés ${proximosVencer.length} gasto${proximosVencer.length > 1 ? 's' : ''} próximo${proximosVencer.length > 1 ? 's' : ''} a vencer`,
            icon: '/icon.svg',
            tag: 'gastos-vencer-daily',
            requireInteraction: false
          });
        }
      }
    }
  };

  setInterval(checkAndNotify, 60 * 60 * 1000);
}

export async function scheduleWeeklySummary() {
  if (!('Notification' in window)) return;

  if (Notification.permission !== 'granted') {
    return;
  }

  const checkAndNotify = async () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    if (day === 0 && hour === 20) {
      const { supabase } = await import('./supabase');

      const hoy = new Date();
      const unaSemanaAtras = new Date(hoy);
      unaSemanaAtras.setDate(unaSemanaAtras.getDate() - 7);

      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      const { data: movimientosSemana } = await supabase
        .from('movimientos')
        .select('monto, tipo')
        .eq('tipo', 'EGRESO')
        .gte('fecha', unaSemanaAtras.toISOString().split('T')[0]);

      const { data: movimientosMes } = await supabase
        .from('movimientos')
        .select('monto, tipo')
        .eq('tipo', 'EGRESO')
        .gte('fecha', inicioMes.toISOString().split('T')[0]);

      const totalSemana = movimientosSemana?.reduce((sum, m) => sum + Number(m.monto), 0) || 0;
      const totalMes = movimientosMes?.reduce((sum, m) => sum + Number(m.monto), 0) || 0;

      new Notification('Casa Franco - Resumen semanal', {
        body: `Esta semana gastaron $${totalSemana.toLocaleString('es-AR')}. Van $${totalMes.toLocaleString('es-AR')} en el mes.`,
        icon: '/icon.svg',
        tag: 'weekly-summary',
        requireInteraction: false
      });
    }
  };

  setInterval(checkAndNotify, 60 * 60 * 1000);
}
