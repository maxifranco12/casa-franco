import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import './Admin.css';

const ADMIN_UID = 'f29e730d-4395-4075-8be8-8d7104a1d716';

interface FamiliaData {
  id: string;
  nombre_familia: string;
  activo: boolean;
  created_at: string;
  usuariosCount: number;
  totalGastado: number;
  isNew: boolean;
}

interface FamiliaDetail {
  id: string;
  nombre_familia: string;
  activo: boolean;
  created_at: string;
  usuarios: { nombre: string; email: string | null }[];
  totalMovimientos: number;
  totalGastado: number;
  totalIngresado: number;
}

export default function Admin() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [familias, setFamilias] = useState<FamiliaData[]>([]);
  const [totalFamilias, setTotalFamilias] = useState(0);
  const [nuevasEsteMes, setNuevasEsteMes] = useState(0);
  const [detailFamilia, setDetailFamilia] = useState<FamiliaDetail | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id === ADMIN_UID) {
      setIsAuthed(true);
      await cargarDatos();
    }
    setLoading(false);
  }

  async function cargarDatos() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: familiasData } = await supabase
      .from('familias')
      .select('*')
      .order('created_at', { ascending: false });

    if (!familiasData) return;

    setTotalFamilias(familiasData.filter(f => f.activo).length);
    setNuevasEsteMes(familiasData.filter(f => f.activo && new Date(f.created_at) >= new Date(startOfMonth)).length);

    const familiasWithStats: FamiliaData[] = await Promise.all(
      familiasData.map(async (f) => {
        const { count: usuariosCount } = await supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('familia_id', f.id);

        const { data: movs } = await supabase
          .from('movimientos')
          .select('monto')
          .eq('familia_id', f.id)
          .eq('tipo', 'EGRESO');

        const totalGastado = movs?.reduce((s, m) => s + Number(m.monto), 0) || 0;

        return {
          id: f.id,
          nombre_familia: f.nombre_familia,
          activo: f.activo,
          created_at: f.created_at,
          usuariosCount: usuariosCount || 0,
          totalGastado,
          isNew: new Date(f.created_at) >= new Date(startOfMonth),
        };
      })
    );

    setFamilias(familiasWithStats);
  }

  async function verDetalle(familiaId: string) {
    const { data: familia } = await supabase
      .from('familias')
      .select('*')
      .eq('id', familiaId)
      .single();

    if (!familia) return;

    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('nombre, email')
      .eq('familia_id', familiaId);

    const { count: totalMovimientos } = await supabase
      .from('movimientos')
      .select('*', { count: 'exact', head: true })
      .eq('familia_id', familiaId);

    const { data: egresos } = await supabase
      .from('movimientos')
      .select('monto')
      .eq('familia_id', familiaId)
      .eq('tipo', 'EGRESO');

    const { data: ingresos } = await supabase
      .from('movimientos')
      .select('monto')
      .eq('familia_id', familiaId)
      .eq('tipo', 'INGRESO');

    setDetailFamilia({
      id: familia.id,
      nombre_familia: familia.nombre_familia,
      activo: familia.activo,
      created_at: familia.created_at,
      usuarios: usuarios || [],
      totalMovimientos: totalMovimientos || 0,
      totalGastado: egresos?.reduce((s, m) => s + Number(m.monto), 0) || 0,
      totalIngresado: ingresos?.reduce((s, m) => s + Number(m.monto), 0) || 0,
    });
  }

  async function desactivarFamilia(familiaId: string) {
    if (!confirm('Estás seguro de desactivar esta familia?')) return;

    await supabase
      .from('familias')
      .update({ activo: false })
      .eq('id', familiaId);

    cargarDatos();
  }

  if (loading) {
    return <div className="admin-loading">Cargando...</div>;
  }

  if (!isAuthed) {
    return <div className="admin-unauthorized">Acceso no autorizado</div>;
  }

  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p>Vista general de todas las familias</p>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Familias activas</div>
          <div className="admin-stat-value">{totalFamilias}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Nuevas este mes</div>
          <div className="admin-stat-value">{nuevasEsteMes}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total familias</div>
          <div className="admin-stat-value">{familias.length}</div>
        </div>
      </div>

      <div className="admin-section">
        <h2>Todas las familias</h2>
        {familias.map(f => (
          <div key={f.id} className="admin-familia-card" style={{ opacity: f.activo ? 1 : 0.6 }}>
            <div className="admin-familia-header">
              <div className="admin-familia-name">
                {f.nombre_familia}
                {f.isNew && <span style={{ marginLeft: 8, fontSize: 11, background: '#C6F6D5', color: '#276749', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>NUEVA</span>}
                {!f.activo && <span style={{ marginLeft: 8, fontSize: 11, background: '#FED7D7', color: '#9B2C2C', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>INACTIVA</span>}
              </div>
            </div>
            <div className="admin-familia-meta">
              <div className="admin-meta-item">
                <span className="admin-meta-label">Usuarios</span>
                <span className="admin-meta-value">{f.usuariosCount}</span>
              </div>
              <div className="admin-meta-item">
                <span className="admin-meta-label">Total gastado</span>
                <span className="admin-meta-value">{formatCurrency(f.totalGastado)}</span>
              </div>
              <div className="admin-meta-item">
                <span className="admin-meta-label">Creada</span>
                <span className="admin-meta-value">{new Date(f.created_at).toLocaleDateString('es-AR')}</span>
              </div>
            </div>
            <div className="admin-familia-actions">
              <button className="admin-view-btn" onClick={() => verDetalle(f.id)}>
                Ver detalle
              </button>
              {f.activo && (
                <button className="admin-deactivate-btn" onClick={() => desactivarFamilia(f.id)}>
                  Desactivar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {detailFamilia && (
        <div className="admin-detail-modal" onClick={() => setDetailFamilia(null)}>
          <div className="admin-detail-content" onClick={(e) => e.stopPropagation()}>
            <h3>{detailFamilia.nombre_familia}</h3>
            <div className="admin-detail-row">
              <span>Estado</span>
              <span>{detailFamilia.activo ? 'Activa' : 'Inactiva'}</span>
            </div>
            <div className="admin-detail-row">
              <span>Creada</span>
              <span>{new Date(detailFamilia.created_at).toLocaleDateString('es-AR')}</span>
            </div>
            <div className="admin-detail-row">
              <span>Usuarios</span>
              <span>{detailFamilia.usuarios.length}</span>
            </div>
            <div className="admin-detail-row">
              <span>Total movimientos</span>
              <span>{detailFamilia.totalMovimientos}</span>
            </div>
            <div className="admin-detail-row">
              <span>Total gastado</span>
              <span>{formatCurrency(detailFamilia.totalGastado)}</span>
            </div>
            <div className="admin-detail-row">
              <span>Total ingresado</span>
              <span>{formatCurrency(detailFamilia.totalIngresado)}</span>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="admin-meta-label" style={{ marginBottom: 8 }}>Miembros</div>
              {detailFamilia.usuarios.map((u, i) => (
                <div key={i} className="admin-detail-row">
                  <span>{u.nombre}</span>
                  <span>{u.email || '-'}</span>
                </div>
              ))}
            </div>

            <button className="admin-detail-close" onClick={() => setDetailFamilia(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
