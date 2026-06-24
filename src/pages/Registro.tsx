import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import './Registro.css';

export default function Registro() {
  const navigate = useNavigate();
  const { setCurrentUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreFamilia, setNombreFamilia] = useState('');
  const [tuNombre, setTuNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password || !nombreFamilia || !tuNombre) {
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

      const { data: familiaData, error: familiaError } = await supabase
        .from('familias')
        .insert({ nombre_familia: nombreFamilia, activo: true })
        .select()
        .single();

      if (familiaError || !familiaData) {
        setError('Error al crear la familia');
        setLoading(false);
        return;
      }

      const familiaId = familiaData.id;

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

      const { data: configData } = await supabase
        .from('configuracion')
        .select('id')
        .eq('clave', 'foto_inicio')
        .maybeSingle();

      if (!configData) {
        await supabase
          .from('configuracion')
          .insert({
            clave: 'foto_inicio',
            valor: '/image0.jpeg',
            familia_id: familiaId,
          });
      }

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

  return (
    <div className="registro-container">
      <div className="registro-card">
        <h1 className="registro-title">Crear nueva familia</h1>
        <p className="registro-subtitle">
          Registrate y empezá a gestionar las finanzas de tu familia
        </p>

        {error && <div className="registro-error">{error}</div>}

        <form className="registro-form" onSubmit={handleRegistro}>
          <div className="registro-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          <div className="registro-field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>

          <div className="registro-field">
            <label>Nombre de la familia</label>
            <input
              type="text"
              value={nombreFamilia}
              onChange={(e) => setNombreFamilia(e.target.value)}
              placeholder="Ej: Familia García"
            />
          </div>

          <div className="registro-field">
            <label>Tu nombre</label>
            <input
              type="text"
              value={tuNombre}
              onChange={(e) => setTuNombre(e.target.value)}
              placeholder="Ej: María"
            />
          </div>

          <button type="submit" className="registro-submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar'}
          </button>
        </form>

        <div className="registro-link">
          Ya tenés cuenta? <a href="/login">Iniciá sesión</a>
        </div>
      </div>
    </div>
  );
}
