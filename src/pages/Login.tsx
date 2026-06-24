import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Usuario } from '../types';
import './Login.css';

export default function Login() {
  const { setCurrentUser } = useApp();
  const navigate = useNavigate();
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [users, setUsers] = useState<Usuario[]>([]);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasFamilia, setHasFamilia] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
      setBackgroundImage('/image0.jpeg');
      setReady(true);
      return;
    }
    init();
  }, []);

  async function init() {
    const familiaId = localStorage.getItem('familia_id');
    setHasFamilia(!!familiaId);

    if (familiaId) {
      await Promise.all([cargarFotoInicio(familiaId), cargarUsuarios(familiaId)]);
    } else {
      setBackgroundImage('/image0.jpeg');
    }
    setReady(true);
  }

  async function cargarUsuarios(familiaId: string) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('familia_id', familiaId)
      .order('nombre');

    if (data) {
      setUsers(data);
    }
  }

  async function cargarFotoInicio(familiaId: string) {
    const { data } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'foto_inicio')
      .eq('familia_id', familiaId)
      .maybeSingle();

    if (data?.valor) {
      setBackgroundImage(data.valor);
    } else {
      setBackgroundImage('/image0.jpeg');
    }
  }

  function handleUserSelect(user: Usuario) {
    setCurrentUser(user);
    navigate('/');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Email o contraseña incorrectos');
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_id', data.user.id)
        .single();

      if (userData) {
        localStorage.setItem('familia_id', userData.familia_id);
        setCurrentUser(userData);
        navigate('/');
      } else {
        setError('Usuario no encontrado');
      }
    }

    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail);

    if (resetError) {
      setError('Error al enviar el email');
    } else {
      setResetSent(true);
    }

    setResetLoading(false);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setUpdateLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setUpdateLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setUpdateLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError('Error al actualizar la contraseña');
    } else {
      setPasswordUpdated(true);
      window.location.hash = '';
    }

    setUpdateLoading(false);
  }

  if (!ready) {
    return null;
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

        {isRecovery ? (
          <div className="login-recovery-form">
            {error && <div className="login-error">{error}</div>}

            {passwordUpdated ? (
              <div className="login-reset-success">
                Contraseña actualizada correctamente
                <button
                  className="login-auth-btn"
                  style={{ marginTop: '16px' }}
                  onClick={() => {
                    setIsRecovery(false);
                    setPasswordUpdated(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Ir al login
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="login-auth-form">
                <input
                  type="password"
                  className="login-input"
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="login-input"
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="submit" className="login-auth-btn" disabled={updateLoading}>
                  {updateLoading ? 'Actualizando...' : 'Cambiar contraseña'}
                </button>
              </form>
            )}
          </div>
        ) : hasFamilia ? (
          <div className="login-buttons">
            {users.map(user => (
              <button
                key={user.id}
                className="login-button"
                onClick={() => handleUserSelect(user)}
              >
                {user.foto_url && (
                  <img src={user.foto_url} alt={user.nombre} className="user-login-avatar" />
                )}
                <span>{user.nombre}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            {error && <div className="login-error">{error}</div>}

            <form className="login-auth-form" onSubmit={handleLogin}>
              <input
                type="email"
                className="login-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="login-input"
                placeholder="Contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit" className="login-auth-btn" disabled={loading}>
                {loading ? 'Iniciando...' : 'Iniciar sesion'}
              </button>
              <button
                type="button"
                className="login-forgot-link"
                onClick={() => setShowReset(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>

            <div className="login-divider">o</div>

            <button
              className="login-register-btn"
              onClick={() => navigate('/registro')}
            >
              Crear nueva familia
            </button>

            {showReset && (
              <div className="login-reset-overlay">
                <div className="login-reset-modal">
                  {resetSent ? (
                    <p className="login-reset-success">Revisá tu email para cambiar la contraseña</p>
                  ) : (
                    <form onSubmit={handleResetPassword} className="login-reset-form">
                      <label className="login-reset-label">Email</label>
                      <input
                        type="email"
                        className="login-input"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                      <button type="submit" className="login-auth-btn" disabled={resetLoading}>
                        {resetLoading ? 'Enviando...' : 'Enviar link de reset'}
                      </button>
                    </form>
                  )}
                  <button
                    className="login-reset-close"
                    onClick={() => {
                      setShowReset(false);
                      setResetSent(false);
                      setResetEmail('');
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
