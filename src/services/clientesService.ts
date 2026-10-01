import { Cliente, Pedido } from '../types';

const LOCAL_STORAGE_KEY = 'delicias_belgi_clientes';

function getLocalClientes(): Cliente[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('LocalStorage error reading clientes:', e);
  }
  return [];
}

function saveLocalClientes(items: Cliente[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_clientes_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving clientes:', e);
  }
}

export const clientesService = {
  subscribeToClientes(callback: (items: Cliente[]) => void): () => void {
    callback(getLocalClientes());
    const handler = () => callback(getLocalClientes());
    window.addEventListener('delicias_clientes_changed', handler);
    return () => {
      window.removeEventListener('delicias_clientes_changed', handler);
    };
  },

  async getClientes(): Promise<Cliente[]> {
    return getLocalClientes();
  },

  async registrarOActualizarClienteDesdePedido(pedido: Pedido): Promise<void> {
    if (!pedido.cliente || !pedido.telefono) return;
    const cleanTel = pedido.telefono.replace(/\D/g, '');
    const cleanNombre = pedido.cliente.trim();
    if (!cleanNombre || !cleanTel) return;

    const list = getLocalClientes();
    const existingIndex = list.findIndex(
      (c) => (c.telefono && c.telefono.replace(/\D/g, '') === cleanTel) ||
             (c.nombre && c.nombre.toLowerCase().trim() === cleanNombre.toLowerCase())
    );

    const now = new Date().toISOString();
    const gastoAdicional = Number(pedido.total) || 0;

    if (existingIndex !== -1) {
      const c = list[existingIndex];
      list[existingIndex] = {
        ...c,
        nombre: cleanNombre,
        direccion: pedido.direccion || c.direccion || '',
        cantidadPedidos: (Number(c.cantidadPedidos) || 0) + 1,
        totalGastado: (Number(c.totalGastado) || 0) + gastoAdicional,
        ultimoPedido: pedido.numeroPedido || c.ultimoPedido || '',
        fechaUltimoPedido: pedido.fecha || now,
        updatedAt: now,
      };
    } else {
      list.push({
        id: 'cli-' + Date.now(),
        nombre: cleanNombre,
        telefono: cleanTel,
        direccion: pedido.direccion || '',
        cantidadPedidos: 1,
        totalGastado: gastoAdicional,
        ultimoPedido: pedido.numeroPedido || '',
        fechaUltimoPedido: pedido.fecha || now,
        createdAt: now,
        updatedAt: now,
      });
    }

    list.sort((a, b) => (b.totalGastado || 0) - (a.totalGastado || 0));
    saveLocalClientes(list);
  },

  async actualizarDireccionCliente(telefono: string, direccion: string): Promise<void> {
    const cleanTel = telefono.replace(/\D/g, '');
    const list = getLocalClientes();
    const idx = list.findIndex((c) => c.telefono.replace(/\D/g, '') === cleanTel);
    if (idx !== -1) {
      list[idx].direccion = direccion;
      list[idx].updatedAt = new Date().toISOString();
      saveLocalClientes(list);
    }
  },

  async getClienteByTelefono(telefono: string): Promise<Cliente | null> {
    const cleanTel = telefono.replace(/\D/g, '');
    const list = getLocalClientes();
    return list.find((c) => c.telefono.replace(/\D/g, '') === cleanTel) || null;
  },

  suscribirClientes(callback: (items: Cliente[]) => void): () => void {
    return this.subscribeToClientes(callback);
  },
};
