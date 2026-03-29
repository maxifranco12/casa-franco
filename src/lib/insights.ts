import { Movimiento } from '../types';

export function detectUnusualSpending(
  movimientos: Movimiento[],
  categoria: string
): { isUnusual: boolean; monto: number; average: number } | null {
  const gastosCategoria = movimientos.filter(
    m => m.tipo === 'EGRESO' && m.categoria === categoria
  );

  if (gastosCategoria.length < 3) return null;

  const montos = gastosCategoria.map(g => Number(g.monto));
  const average = montos.reduce((a, b) => a + b, 0) / montos.length;
  const maxMonto = Math.max(...montos);

  if (maxMonto > average * 3) {
    return { isUnusual: true, monto: maxMonto, average };
  }

  return null;
}

export function calculateSavingsStreak(
  historialMeses: any[],
  presupuesto: number | null
): number {
  if (!presupuesto) return 0;

  let streak = 0;
  const sorted = [...historialMeses].sort((a, b) => {
    if (a.anio !== b.anio) return b.anio - a.anio;
    return b.mes - a.mes;
  });

  for (const mes of sorted) {
    if (mes.total_gastado <= presupuesto) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function detectSmallExpenses(movimientos: Movimiento[]): {
  total: number;
  count: number;
  items: Movimiento[];
} {
  const smallExpenses = movimientos.filter(
    m => m.tipo === 'EGRESO' && Number(m.monto) < 5000
  );

  return {
    total: smallExpenses.reduce((sum, m) => sum + Number(m.monto), 0),
    count: smallExpenses.length,
    items: smallExpenses
  };
}

export function calculateProjectedSpending(
  totalGastado: number,
  diaActual: number,
  diasEnMes: number
): number {
  if (diaActual === 0) return 0;
  const promedioDiario = totalGastado / diaActual;
  return promedioDiario * diasEnMes;
}

export function getDaysRemainingInMonth(): number {
  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return ultimoDia.getDate() - hoy.getDate();
}

export function getDaysElapsedInMonth(): number {
  const hoy = new Date();
  return hoy.getDate();
}

export function getDaysInMonth(): number {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
}

export function groupByWeek(movimientos: Movimiento[]): Record<number, { total: number; items: Movimiento[] }> {
  const weeks: Record<number, { total: number; items: Movimiento[] }> = {};

  movimientos.forEach(mov => {
    const fecha = new Date(mov.fecha);
    const dia = fecha.getDate();
    const weekNumber = Math.ceil(dia / 7);

    if (!weeks[weekNumber]) {
      weeks[weekNumber] = { total: 0, items: [] };
    }

    weeks[weekNumber].items.push(mov);
    if (mov.tipo === 'EGRESO') {
      weeks[weekNumber].total += Number(mov.monto);
    }
  });

  return weeks;
}

export function calculateSpendingByPerson(
  movimientos: Movimiento[]
): Record<string, number> {
  const byPerson: Record<string, number> = {};

  movimientos
    .filter(m => m.tipo === 'EGRESO' && m.quien_pago)
    .forEach(mov => {
      const personId = mov.quien_pago!;
      byPerson[personId] = (byPerson[personId] || 0) + Number(mov.monto);
    });

  return byPerson;
}
