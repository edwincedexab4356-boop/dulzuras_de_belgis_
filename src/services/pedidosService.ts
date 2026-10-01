import { clientesService } from './clientesService';
import { ventasService } from './ventasService';
import { Pedido, PedidoEstado, PedidoProductoItem, TipoPedido } from '../types';
import { formatTimePanama, getPanamaTodayYMD } from '../utils/formatters';

const LOCAL_STORAGE_KEY = 'delicias_belgi_pedidos';

function normalizePedido(docId: string, data: any): Pedido {
  const customerName = data.customerName || data.cliente || 'Cliente';
  const customerPhone = data.customerPhone || data.telefono || '';
  const orderType: TipoPedido = data.orderType || data.tipoPedido || 'para_recoger';
  const address = data.address || data.direccion || '';
  const items: PedidoProductoItem[] = (data.items || data.productos || []).map((it: any) => ({
    id: it.id || '',
    nombre: it.nombre || it.name || 'Producto',
    name: it.nombre || it.name || 'Producto',
    cantidad: Number(it.cantidad || it.quantity || 1),
    quantity: Number(it.cantidad || it.quantity || 1),
    precio: Number(it.precio || it.price || 0),
    price: Number(it.precio || it.price || 0),
    subtotal: Number(it.subtotal || (Number(it.precio || it.price || 0) * Number(it.cantidad || it.quantity || 1))),
  }));
  const status: PedidoEstado = (data.status || data.estado || 'pendiente') as PedidoEstado;
  const subtotal = Number(data.subtotal || items.reduce((acc, it) => acc + it.subtotal, 0));
  const total = Number(data.total || subtotal);
  const notes = data.notes || data.notas || '';
  const numeroPedido = data.numeroPedido || data.orderNumber || `#ORD-${docId.slice(-4).toUpperCase()}`;

  let createdAtStr = new Date().toISOString();
  if (data.createdAt) {
    if (typeof data.createdAt === 'string') {
      createdAtStr = data.createdAt;
    } else if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
      createdAtStr = data.createdAt.toDate().toISOString();
    }
  }
  let updatedAtStr = createdAtStr;
  if (data.updatedAt) {
    if (typeof data.updatedAt === 'string') {
      updatedAtStr = data.updatedAt;
    } else if (data.updatedAt.toDate && typeof data.updatedAt.toDate === 'function') {
      updatedAtStr = data.updatedAt.toDate().toISOString();
    }
  }

  const horaStr = data.hora || formatTimePanama(createdAtStr);
  const fechaStr = data.fecha || getPanamaTodayYMD();

  return {
    id: docId,
    numeroPedido,
    cliente: customerName,
    telefono: customerPhone,
    tipoPedido: orderType,
    tipoEntrega: orderType,
    direccion: address,
    productos: items,
    items,
    subtotal,
    total,
    notas: notes,
    notes,
    estado: status,
    status,
    fecha: fechaStr,
    hora: horaStr,
    customerName,
    customerPhone,
    orderType,
    address,
    ventaContabilizada: Boolean(data.ventaContabilizada),
    inventarioDescontado: Boolean(data.inventarioDescontado),
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  };
}

function getLocalPedidos(): Pedido[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list)) {
        return list.map((p, i) => normalizePedido(p.id || `loc-${i}`, p));
      }
    }
  } catch (e) {
    console.warn('LocalStorage error reading pedidos:', e);
  }
  return [];
}

function saveLocalPedidos(items: Pedido[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_pedidos_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving pedidos:', e);
  }
}

export const pedidosService = {
  subscribeToPedidos(callback: (items: Pedido[]) => void): () => void {
    callback(getLocalPedidos());
    const handler = () => callback(getLocalPedidos());
    window.addEventListener('delicias_pedidos_changed', handler);
    return () => {
      window.removeEventListener('delicias_pedidos_changed', handler);
    };
  },

  async getPedidos(): Promise<Pedido[]> {
    return getLocalPedidos();
  },

  async getPedidoById(id: string): Promise<Pedido | null> {
    const list = getLocalPedidos();
    return list.find((p) => p.id === id) || null;
  },

  async createPedido(pedidoData: {
    cliente?: string;
    customerName?: string;
    telefono?: string;
    customerPhone?: string;
    tipoPedido?: TipoPedido;
    orderType?: TipoPedido;
    tipoEntrega?: string;
    direccion?: string;
    address?: string;
    productos?: PedidoProductoItem[];
    items?: PedidoProductoItem[];
    subtotal?: number;
    total: number;
    notas?: string;
    notes?: string;
    estado?: PedidoEstado;
    status?: PedidoEstado;
  }): Promise<Pedido> {
    const now = new Date().toISOString();
    const docId = 'ped-' + Date.now();
    const created = normalizePedido(docId, {
      ...pedidoData,
      createdAt: now,
      updatedAt: now,
    });
    const local = getLocalPedidos();
    local.unshift(created);
    saveLocalPedidos(local);
    clientesService.registrarOActualizarClienteDesdePedido(created).catch(() => {});
    return created;
  },

  async updateEstadoPedido(id: string, nuevoEstado: PedidoEstado): Promise<void> {
    const local = getLocalPedidos();
    const idx = local.findIndex((p) => p.id === id);
    if (idx !== -1) {
      local[idx].estado = nuevoEstado;
      local[idx].status = nuevoEstado;
      local[idx].updatedAt = new Date().toISOString();
      saveLocalPedidos(local);
    }
  },

  async deletePedido(id: string): Promise<void> {
    const local = getLocalPedidos();
    saveLocalPedidos(local.filter((p) => p.id !== id));
  },

  suscribirPedidos(callback: (items: Pedido[]) => void): () => void {
    return this.subscribeToPedidos(callback);
  },
};
