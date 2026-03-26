import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import './Login.css';

export default function Login() {
  const { users, setCurrentUser } = useApp();
  const navigate = useNavigate();
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  useEffect(() => {
    cargarFotoInicio();
  }, []);

  async function cargarFotoInicio() {
    const { data } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'foto_inicio')
      .maybeSingle();

    if (data?.valor) {
      setBackgroundImage(data.valor);
    } else {
      setBackgroundImage('/image0.jpeg');
    }
  }

  function handleUserSelect(user: typeof users[0]) {
    setCurrentUser(user);
    navigate('/');
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
      </div>
    </div>
  );
}
