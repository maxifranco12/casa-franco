import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Registro.css';

export default function Registro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombreFamilia: '',
    nombreCompleto: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombreCompleto
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      const { data: familia, error: familiaError } = await supabase
        .from('familias')
        .insert({
          nombre_familia: formData.nombreFamilia
        })
        .select()
        .single();

      if (familiaError) throw familiaError;

      const { error: usuarioError } = await supabase
        .from('usuarios')
        .update({
          nombre: formData.nombreCompleto,
          familia_id: familia.id
        })
        .eq('id', authData.user.id);

      if (usuarioError) throw usuarioError;

      navigate('/');
    } catch (err: any) {
      console.error('Error en registro:', err);
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="registro-container">
      <div className="registro-card">
        <h1 className="registro-title">Crear Cuenta</h1>
        <p className="registro-subtitle">Comenzá a gestionar las finanzas de tu familia</p>

        <form onSubmit={handleSubmit} className="registro-form">
          <div className="form-group">
            <label htmlFor="nombreFamilia">Nombre de la familia</label>
            <input
              type="text"
              id="nombreFamilia"
              name="nombreFamilia"
              value={formData.nombreFamilia}
              onChange={handleChange}
              placeholder="Ej: Casa García"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nombreCompleto">Tu nombre completo</label>
            <input
              type="text"
              id="nombreCompleto"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              placeholder="Ej: Juan García"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repetí tu contraseña"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="registro-footer">
          <span>¿Ya tenés cuenta?</span>
          <button onClick={() => navigate('/login')} className="btn-link">
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
