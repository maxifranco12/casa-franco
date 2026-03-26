export interface Usuario {
  id: string;
  nombre: string;
  foto_url?: string | null;
  created_at: string;
}

export interface GastoFijoPlantilla {
  id: string;
  nombre: string;
  monto_estimado: number;
  dia_pago: string;
  dia_vencimiento: number | null;
  activo: boolean;
  created_at: string;
  updated_at?: string;
  diasRestantes?: number;
}

export interface HistorialPagoGastoFijo {
  id: string;
  plantilla_id: string;
  monto: number;
  fecha_pago: string;
  medio_pago: string;
  mes: number;
  anio: number;
  registrado_por: string | null;
  created_at: string;
  usuario?: Usuario;
}

export interface GastoFijoMes {
  id: string;
  plantilla_id: string;
  mes: number;
  anio: number;
  estado: 'PENDIENTE' | 'PAGADO';
  monto_real: number | null;
  fecha_pago: string | null;
  medio_pago: string | null;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
  plantilla?: GastoFijoPlantilla;
  usuario?: Usuario;
}

export interface Movimiento {
  id: string;
  tipo: 'INGRESO' | 'EGRESO';
  descripcion: string;
  monto: number;
  fecha: string;
  categoria: string | null;
  medio_pago: string;
  quien_pago: string | null;
  sale_de_caja: boolean;
  nota: string | null;
  comprobante_url: string | null;
  registrado_por: string | null;
  created_at: string;
  usuario?: Usuario;
}

export interface Configuracion {
  id: string;
  clave: string;
  valor: string | null;
  updated_at: string;
}

export const MEDIOS_PAGO = [
  'MP Maxi',
  'MP Caro',
  'Efectivo'
] as const;

export const CATEGORIAS_GASTOS = [
  'Supermercado',
  'Verdulería',
  'Carnicería',
  'Farmacia',
  'Dietética',
  'Kasher',
  'Salidas en familia',
  'Combustible',
  'Arreglos del hogar',
  'Limpieza',
  'Gastos extra / Varios'
] as const;
