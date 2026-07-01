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
  const [hasFamilia, setHasFamilia] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
  if (!localStorage.getItem('familia_id')) {
    localStorage.setItem('familia_id', '68c65ee4-e11c-4603-ba6a-279553d66078');
  }
}, []);

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
          <div className="login-new-family">
            <button
              className="login-register-btn"
              onClick={() => navigate('/registro')}
            >
              Crear nueva familia
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
