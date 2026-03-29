import { supabase } from './supabase';
import { formatCurrency } from './currency';
import { RealtimeChannel } from '@supabase/supabase-js';

let realtimeChannel: RealtimeChannel | null = null;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function subscribeToMovimientos(
  currentUserId: string | null,
  familiaId: string | null,
  onNewMovement?: () => void
) {
  if (realtimeChannel) {
    return;
  }

  realtimeChannel = supabase
    .channel('movimientos-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'movimientos'
      },
      async (payload) => {
        const newMovimiento = payload.new;

        if (newMovimiento.registrado_por === currentUserId) {
          return;
        }

        if (familiaId && newMovimiento.familia_id !== familiaId) {
          return;
        }

        if (onNewMovement) {
          onNewMovement();
        }

        const { data: usuario } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', newMovimiento.registrado_por)
          .maybeSingle();

        if (Notification.permission === 'granted' && usuario) {
          const tipo = newMovimiento.tipo === 'INGRESO' ? 'ingreso' : 'egreso';
          const monto = formatCurrency(newMovimiento.monto);
          const descripcion = newMovimiento.descripcion;

          new Notification('Casa Franco 🏠', {
            body: `${usuario.nombre} registró un ${tipo} de ${monto} - ${descripcion}`,
            icon: '/image0.jpeg',
            tag: `movimiento-${newMovimiento.id}`,
            requireInteraction: false
          });
        }
      }
    )
    .subscribe();
}

export function unsubscribeFromMovimientos() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}
