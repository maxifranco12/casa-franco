import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import './Unirse.css';

export default function Unirse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCurrentUser } = useApp();
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tuNombre, setTuNombre] = useState('');
  const [familiaNombre, setFamiliaNombre] = useState('');
  const [familiaId, setFamiliaId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    if (token) {
      verificarToken();
    } else {
      setValidToken(false);
    }
  }, [token]);

  async function verificarToken() {
    const { data } = await supabase
      .from('invitaciones')
      .select('familia_id, usado, expires_at, familias(nombre_familia)')
      .eq('token', token)
      .maybeSingle();

    if (!data || data.usado || new Date(data.expires_at) < new Date()) {
      setValidToken(false);
      return;
    }

    setFamiliaId(data.familia_id);
    setFamiliaNombre((data.familias as any)?.nombre_familia || '');
    setValidToken(true);
  }

  async function handleUnirse(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password || !tuNombre) {
      setError('Completá todos los campos');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setError('Error al crear la cuenta');
        setLoading(false);
        return;
      }

      const { error: usuarioError } = await supabase
        .from('usuarios')
        .insert({
          id: userId,
          nombre: tuNombre,
          email,
          familia_id: familiaId,
        });

      if (usuarioError) {
        setError('Error al crear el usuario');
        setLoading(false);
        return;
      }

      await supabase
        .from('invitaciones')
        .update({ usado: true })
        .eq('token', token);

      setCurrentUser({
        id: userId,
        nombre: tuNombre,
        email,
        familia_id: familiaId,
        created_at: new Date().toISOString(),
      });

      navigate('/');
    } catch (err) {
      setError('Error inesperado. Intentá de nuevo.');
    }

    setLoading(false);
  }

  if (validToken === null) {
    return (
      <div className="unirse-container">
        <div className="unirse-card">
          <p className="unirse-subtitle">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="unirse-container">
        <div className="unirse-card">
          <div className="unirse-invalid">
            <h2>Invitación inválida</h2>
            <p>Este link expiró o ya fue usado.</p>
            <p style={{ marginTop: 16 }}>
              <a href="/login" style={{ color: '#2D3748', fontWeight: 600 }}>Ir al inicio</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unirse-container">
      <div className="unirse-card">
        <h1 className="unirse-title">Te invitaron a unirte</h1>
        <p className="unirse-family-name">{familiaNombre}</p>
        <p className="unirse-subtitle">
          Creá tu cuenta para empezar a gestionar las finanzas juntos
        </p>

        {error && <div className="unirse-error">{error}</div>}

        <form className="unirse-form" onSubmit={handleUnirse}>
          <div className="unirse-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          <div className="unirse-field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>

          <div className="unirse-field">
            <label>Tu nombre</label>
            <input
              type="text"
              value={tuNombre}
              onChange={(e) => setTuNombre(e.target.value)}
              placeholder="Ej: Carlos"
            />
          </div>

          <button type="submit" className="unirse-submit" disabled={loading}>
            {loading ? 'Uniéndote...' : 'Unirme'}
          </button>
        </form>
      </div>
    </div>
  );
}
