import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Usuario } from '../types';
import { formatMontoInput, parseMontoInput } from '../lib/formatMonto';
import './Configuracion.css';

export default function Configuracion() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [fotoInicio, setFotoInicio] = useState('');
  const [presupuestoMensual, setPresupuestoMensual] = useState('');
  const [loading, setLoading] = useState(true);
  const [editandoNombre, setEditandoNombre] = useState<string | null>(null);
  const [nombreTemporal, setNombreTemporal] = useState('');
  const [destacarPresupuesto, setDestacarPresupuesto] = useState(false);
  const presupuestoRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    cargarDatos();

    if (location.state?.fromBanner) {
      setTimeout(() => {
        presupuestoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setDestacarPresupuesto(true);
        setTimeout(() => setDestacarPresupuesto(false), 3000);
      }, 100);
    }
  }, [location]);

  async function cargarDatos() {
    setLoading(true);

    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre');

    const { data: fotoData } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'foto_inicio')
      .maybeSingle();

    const { data: presupuestoData } = await supabase
      .from('configuracion')
      .select('presupuesto_mensual')
      .eq('clave', 'foto_inicio')
      .maybeSingle();

    if (usuariosData) {
      setUsuarios(usuariosData);
    }

    if (fotoData) {
      setFotoInicio(fotoData.valor || '');
    }

    if (presupuestoData && presupuestoData.presupuesto_mensual) {
      setPresupuestoMensual(formatMontoInput(String(presupuestoData.presupuesto_mensual)));
    }

    setLoading(false);
  }

  async function actualizarFotoUsuario(usuarioId: string, file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fotoUrl = e.target?.result as string;

      const { error } = await supabase
        .from('usuarios')
        .update({ foto_url: fotoUrl })
        .eq('id', usuarioId);

      if (!error) {
        cargarDatos();
      } else {
        alert('Error al actualizar la foto');
      }
    };
    reader.readAsDataURL(file);
  }

  async function actualizarFotoInicio(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fotoUrl = e.target?.result as string;

      const { error } = await supabase
        .from('configuracion')
        .update({ valor: fotoUrl, updated_at: new Date().toISOString() })
        .eq('clave', 'foto_inicio');

      if (!error) {
        setFotoInicio(fotoUrl);
      } else {
        alert('Error al actualizar la foto de inicio');
      }
    };
    reader.readAsDataURL(file);
  }

  async function actualizarNombreUsuario(usuarioId: string) {
    if (!nombreTemporal.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }

    const { error } = await supabase
      .from('usuarios')
      .update({ nombre: nombreTemporal.trim() })
      .eq('id', usuarioId);

    if (!error) {
      setEditandoNombre(null);
      setNombreTemporal('');
      cargarDatos();
    } else {
      alert('Error al actualizar el nombre');
    }
  }

  function iniciarEdicionNombre(usuario: Usuario) {
    setEditandoNombre(usuario.id);
    setNombreTemporal(usuario.nombre);
  }

  function cancelarEdicionNombre() {
    setEditandoNombre(null);
    setNombreTemporal('');
  }

  async function actualizarPresupuesto() {
    const monto = parseMontoInput(presupuestoMensual);

    if (monto <= 0) {
      alert('Ingresá un presupuesto válido');
      return;
    }

    const { error } = await supabase
      .from('configuracion')
      .update({ presupuesto_mensual: monto, updated_at: new Date().toISOString() })
      .eq('clave', 'foto_inicio');

    if (!error) {
      alert('Presupuesto mensual guardado');
    } else {
      alert('Error al guardar el presupuesto');
    }
  }

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="configuracion">
      <div className="config-header">
        <h1>Configuración</h1>
      </div>

      <div
        ref={presupuestoRef}
        className={`config-section presupuesto-section ${destacarPresupuesto ? 'destacado' : ''}`}
      >
        <h2>Presupuesto mensual</h2>
        <p className="section-description">
          Ingresá el presupuesto mensual estimado para gastos (fijos + variables).
          Esto activa la Inteligencia Financiera en el Dashboard.
        </p>
        <div className="presupuesto-card">
          <div className="presupuesto-input-group">
            <input
              type="text"
              inputMode="numeric"
              value={presupuestoMensual}
              onChange={(e) => setPresupuestoMensual(formatMontoInput(e.target.value))}
              placeholder="$0"
              className="presupuesto-input"
            />
            <button onClick={actualizarPresupuesto} className="btn-save-presupuesto">
              Guardar
            </button>
          </div>
        </div>
      </div>

      <div className="config-section">
        <h2>Foto de inicio</h2>
        <div className="photo-upload-card">
          {fotoInicio && (
            <div className="photo-preview">
              <img src={fotoInicio} alt="Foto de inicio" />
            </div>
          )}
          <label className="upload-btn">
            Cambiar foto
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) actualizarFotoInicio(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="config-section">
        <h2>Fotos de usuarios</h2>
        <div className="users-grid">
          {usuarios.map(usuario => (
            <div key={usuario.id} className="user-photo-card">
              <div className="user-avatar">
                {usuario.foto_url ? (
                  <img src={usuario.foto_url} alt={usuario.nombre} />
                ) : (
                  <div className="avatar-placeholder">
                    {usuario.nombre.charAt(0)}
                  </div>
                )}
              </div>
              <div className="user-info">
                {editandoNombre === usuario.id ? (
                  <div className="edit-name-form">
                    <input
                      type="text"
                      value={nombreTemporal}
                      onChange={(e) => setNombreTemporal(e.target.value)}
                      className="name-input"
                      autoFocus
                    />
                    <div className="edit-actions">
                      <button
                        onClick={() => actualizarNombreUsuario(usuario.id)}
                        className="save-btn"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={cancelarEdicionNombre}
                        className="cancel-btn"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 onClick={() => iniciarEdicionNombre(usuario)} className="editable-name">
                      {usuario.nombre}
                    </h3>
                    <label className="upload-btn-small">
                      Cambiar foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) actualizarFotoUsuario(usuario.id, file);
                        }}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
