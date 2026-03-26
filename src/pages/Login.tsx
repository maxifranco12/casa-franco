import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import './Login.css';

export default function Login() {
  const { setCurrentUser, notificationPermission, requestNotificationPermission } = useApp();
  const navigate = useNavigate();
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarFotoInicio();
  }, []);

  async function cargarFotoInicio() {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'foto_inicio')
        .maybeSingle();

      if (error) {
        console.error('Error al cargar foto de inicio desde Supabase:', error);
        setBackgroundImage('/image0.jpeg');
        return;
      }

      if (data?.valor) {
        setBackgroundImage(data.valor);
      } else {
        setBackgroundImage('/image0.jpeg');
      }
    } catch (err) {
      console.error('Error cargando foto de inicio:', err);
      setBackgroundImage('/image0.jpeg');
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Paso 1: Autenticar con Supabase Auth
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;
      if (!authData.user) throw new Error('No se pudo iniciar sesión');

      // Paso 2: Buscar usuario usando usuarios.id = auth.users.id
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (errorUsuario) {
        console.error('Error buscando usuario:', errorUsuario);
        throw new Error('Error al buscar datos del usuario');
      }

      if (!usuario) {
        throw new Error('Usuario no encontrado en la base de datos');
      }

      // Paso 3: Guardar usuario en contexto y navegar
      setCurrentUser(usuario);

      if (notificationPermission === 'default') {
        await requestNotificationPermission();
      }

      if (Notification.permission === 'denied') {
        setShowNotificationBanner(true);
        setTimeout(() => setShowNotificationBanner(false), 5000);
      }

      navigate('/');
    } catch (err: any) {
      console.error('Error en login:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div
        className="login-background"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="login-overlay"></div>
      </div>

      <div className="login-content">
        <h1 className="login-title">Casa Franco</h1>

        {showNotificationBanner && (
          <div className="notification-banner">
            Activá las notificaciones para saber cuando el otro registra gastos
          </div>
        )}

        <div className="email-login-section">
          <form onSubmit={handleEmailLogin} className="email-login-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
            />
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
          <div className="login-footer">
            <span>¿No tenés cuenta?</span>
            <button onClick={() => navigate('/registro')} className="btn-link">
              Crear cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
