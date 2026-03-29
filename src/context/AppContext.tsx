import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '../types';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { autoGenerateMonthlyFixedExpenses } from '../lib/autoGenerateFixedExpenses';
import { subscribeToMovimientos, unsubscribeFromMovimientos } from '../lib/realtimeNotifications';
import { closeMonthAndGenerateHistory } from '../lib/monthlyClosing';

interface AppContextType {
  currentUser: Usuario | null;
  setCurrentUser: (user: Usuario | null) => void;
  users: Usuario[];
  logout: () => void;
  generatedExpensesBanner: string | null;
  dismissBanner: () => void;
  unreadCount: number;
  resetUnreadCount: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState<Usuario[]>([]);
  const [generatedExpensesBanner, setGeneratedExpensesBanner] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    loadUsers();
    solicitarPermisoNotificaciones();
  }, []);

  useEffect(() => {
    if (currentUser?.familia_id) {
      checkAndGenerateMonthlyExpenses();
      checkAndCloseMonth();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      subscribeToMovimientos(currentUser.id, currentUser.familia_id || null, () => {
        setUnreadCount(prev => prev + 1);
      });
    } else {
      unsubscribeFromMovimientos();
    }

    return () => {
      unsubscribeFromMovimientos();
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  async function loadUsers() {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre');

    if (data) {
      setUsers(data);
    }
  }

  async function checkAndGenerateMonthlyExpenses() {
    if (!currentUser?.familia_id) return;

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const lastCheck = localStorage.getItem('lastExpenseGeneration');

    if (lastCheck === monthKey) {
      return;
    }

    const count = await autoGenerateMonthlyFixedExpenses(currentUser.familia_id);

    if (count > 0) {
      const isDayOne = now.getDate() === 1;

      if (isDayOne) {
        setGeneratedExpensesBanner(`¡Nuevo mes! Se generaron ${count} gastos fijos pendientes`);
      }

      localStorage.setItem('lastExpenseGeneration', monthKey);
    }
  }

  async function checkAndCloseMonth() {
    if (!currentUser?.familia_id) return;

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const lastClosure = localStorage.getItem('lastMonthClosure');

    if (lastClosure === monthKey) {
      return;
    }

    const closed = await closeMonthAndGenerateHistory(currentUser.familia_id);

    if (closed) {
      localStorage.setItem('lastMonthClosure', monthKey);
    }
  }

  function dismissBanner() {
    setGeneratedExpensesBanner(null);
  }

  function resetUnreadCount() {
    setUnreadCount(0);
  }

  function logout() {
    setCurrentUser(null);
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

  async function solicitarPermisoNotificaciones() {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
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

    if (!currentUser?.familia_id) return;

    const { data } = await supabase
      .from('gastos_fijos_plantilla')
      .select('*')
      .eq('activo', true)
      .eq('familia_id', currentUser.familia_id);

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

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, users, logout, generatedExpensesBanner, dismissBanner, unreadCount, resetUnreadCount }}>
      {children}
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
