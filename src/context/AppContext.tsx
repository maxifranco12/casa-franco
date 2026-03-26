import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, Movimiento, Familia } from '../types';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { Toast, ToastData } from '../components/Toast';

interface AppContextType {
  currentUser: Usuario | null;
  setCurrentUser: (user: Usuario | null) => void;
  switchToFamilyMember: (userId: string) => Promise<void>;
  users: Usuario[];
  familia: Familia | null;
  familiaId: string | null;
  logout: () => void;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState<Usuario[]>([]);
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [familiaId, setFamiliaId] = useState<string | null>(() => {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return null;
    const user = JSON.parse(saved);
    return user.familia_id || null;
  });
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

  useEffect(() => {
    checkAuthSession();
    solicitarPermisoNotificaciones();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      setFamiliaId(currentUser.familia_id || null);
      loadFamilyData();
      subscribeToMovimientos();
    } else {
      localStorage.removeItem('currentUser');
      setFamilia(null);
      setUsers([]);
      setFamiliaId(null);
    }

    return () => {
      supabase.channel('movimientos-familia').unsubscribe();
    };
  }, [currentUser]);

  async function checkAuthSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Buscar usuario DESPUÉS de confirmar que hay sesión de auth
        const { data: usuario, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error al cargar usuario:', error);
          return;
        }

        if (usuario) {
          setCurrentUser(usuario);
        }
      }
      // No cargar usuarios si no hay sesión (evita consultas innecesarias)
    } catch (err) {
      console.error('Error verificando sesión:', err);
    }
  }

  async function loadFamilyData() {
    if (!currentUser?.familia_id) return;

    const { data: familiaData } = await supabase
      .from('familias')
      .select('*')
      .eq('id', currentUser.familia_id)
      .maybeSingle();

    if (familiaData) {
      setFamilia(familiaData);
    }

    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('*')
      .eq('familia_id', currentUser.familia_id)
      .order('nombre');

    if (usuariosData) {
      setUsers(usuariosData);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setFamilia(null);
    setUsers([]);
  }

  async function switchToFamilyMember(userId: string) {
    if (!currentUser?.familia_id) return;

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .eq('familia_id', currentUser.familia_id)
      .maybeSingle();

    if (!error && usuario) {
      setCurrentUser(usuario);
    }
  }

  function calcularDiasRestantes(diaVencimiento: number | null): number | null {
    if (!diaVencimiento) return null;

    const hoy = new Date();
    const diaActual = hoy.getDate();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    let fechaVencimiento = new Date(anioActual, mesActual, diaVencimiento);

    if (diaActual > diaVencimiento) {
      fechaVencimiento = new Date(anioActual, mesActual + 1, diaVencimiento);
    }

    const diferenciaMilisegundos = fechaVencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

    return diasRestantes;
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  async function solicitarPermisoNotificaciones() {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      verificarYEnviarNotificaciones();
    }
  }

  async function verificarYEnviarNotificaciones() {
    const hoy = new Date().toISOString().split('T')[0];
    const ultimaNotificacion = localStorage.getItem('ultimaNotificacion');

    if (ultimaNotificacion === hoy) {
      return;
    }

    const { data } = await supabase
      .from('gastos_fijos_plantilla')
      .select('*')
      .eq('activo', true);

    if (data) {
      const gastosProximos = data
        .map(gasto => ({
          ...gasto,
          diasRestantes: calcularDiasRestantes(gasto.dia_vencimiento)
        }))
        .filter(gasto => gasto.diasRestantes !== null && gasto.diasRestantes <= 3);

      gastosProximos.forEach(gasto => {
        const dias = gasto.diasRestantes === 0 ? 'hoy' :
                     gasto.diasRestantes === 1 ? 'mañana' :
                     `en ${gasto.diasRestantes} días`;

        new Notification('Casa Franco 🏠', {
          body: `El gasto ${gasto.nombre} vence ${dias} (${formatCurrency(gasto.monto_estimado)})`,
          icon: '/image0.jpeg',
          tag: `gasto-${gasto.id}`,
          requireInteraction: false
        });
      });

      if (gastosProximos.length > 0) {
        localStorage.setItem('ultimaNotificacion', hoy);
      }
    }
  }

  function subscribeToMovimientos() {
    if (!currentUser) return;

    const channel = supabase
      .channel('movimientos-familia')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'movimientos'
        },
        async (payload) => {
          const nuevoMovimiento = payload.new as Movimiento;

          if (nuevoMovimiento.registrado_por === currentUser.id) {
            return;
          }

          const { data: usuario } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', nuevoMovimiento.registrado_por)
            .maybeSingle();

          if (!usuario) return;

          const toastData: ToastData = {
            id: nuevoMovimiento.id,
            tipo: nuevoMovimiento.tipo,
            usuario: usuario.nombre,
            monto: nuevoMovimiento.monto,
            descripcion: nuevoMovimiento.descripcion
          };

          setToasts(prev => [...prev, toastData]);

          if (Notification.permission === 'granted') {
            const formatMonto = (monto: number) => {
              return new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(monto);
            };

            new Notification('Casa Franco 🏠', {
              body: `${usuario.nombre} registró un ${nuevoMovimiento.tipo} de ${formatMonto(nuevoMovimiento.monto)} - ${nuevoMovimiento.descripcion}`,
              icon: '/image0.jpeg',
              tag: `movimiento-${nuevoMovimiento.id}`,
              requireInteraction: false
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  function removeToast(id: string) {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, switchToFamilyMember, users, familia, familiaId, logout, notificationPermission, requestNotificationPermission }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
