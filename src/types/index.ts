// Tipos base para el sistema
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'ventas' | 'produccion' | 'finanzas' | 'calidad';
  permisos: string[];
}

export interface ProductoQuimico {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  unidadMedida: string;
  stockMinimo: number;
  stockActual: number;
  fechaVencimiento?: Date;
  lote: string;
  certificacionesRequeridas: string[];
}

export interface Lote {
  id: string;
  codigo: string;
  productoId: string;
  fechaProduccion: Date;
  fechaVencimiento: Date;
  cantidadProducida: number;
  protocolosCalidad: ProtocoloCalidad[];
  estado: 'en_produccion' | 'completado' | 'aprobado' | 'rechazado';
}

export interface ProtocoloCalidad {
  id: string;
  parametro: string;
  valorEsperado: string;
  valorObtenido: string;
  fechaControl: Date;
  responsable: string;
  resultado: 'aprobado' | 'rechazado';
}

export interface Factura {
  id: string;
  ncf: string;
  cliente: Cliente;
  items: ItemFactura[];
  subtotal: number;
  itbis: number;
  total: number;
  estado: 'pendiente' | 'pagada' | 'vencida';
  fechaEmision: Date;
  fechaVencimiento: Date;
}

export interface Cliente {
  id: string;
  rnc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  contactoPrincipal: string;
  telefono: string;
  email: string;
  limiteCredito: number;
  terminosPago: number;
}