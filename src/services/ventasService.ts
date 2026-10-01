import { Venta, VentaItem, Producto, MetodoPago } from '../types';
import { deduplicateById } from '../utils/deduplicate';
import { formatTimePanama, getPanamaTodayYMD } from '../utils/formatters';
import { inventarioService } from './inventarioService';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'delicias_belgi_ventas';
const DELETED_VENTAS_KEY = 'delicias_belgi_deleted_ventas';

function getDeletedVentasIds(): Set<string> {
  try {
    const saved = localStorage.getItem(DELETED_VENTAS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted ventas IDs:', e);
  }
  return new Set();
}

function addDeletedVentaId(id: string) {
  if (!id) return;
  try {
    const set = getDeletedVentasIds();
    set.add(id);
    localStorage.setItem(DELETED_VENTAS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error saving deleted venta ID:', e);
  }
}

function normalizeMetodoPago(raw?: string): MetodoPago {
  if (!raw) return 'Efectivo';
  const lower = raw.toLowerCase();
  if (lower.includes('yappy')) return 'Yappy';
  if (lower.includes('tarjeta') || lower.includes('card')) return 'Tarjeta';
  if (lower.includes('otro')) return 'Otro';
  return 'Efectivo';
}

function normalizeVenta(id: string, data: any): Venta {
  return {
    id,
    numeroVenta: data.numeroVenta || data.numero_factura || data.numeroFactura || `#FAC-${id.slice(-4).toUpperCase()}`,
    numeroFactura: data.numeroFactura || data.numero_factura || data.numeroVenta || `#FAC-${id.slice(-4).toUpperCase()}`,
    fecha: data.fecha || getPanamaTodayYMD(),
    hora: data.hora || formatTimePanama(new Date().toISOString()),
    items: Array.isArray(data.items) ? data.items : [],
    subtotal: Number(data.subtotal || 0),
    descuento: Number(data.descuento || 0),
    itbms: Number(data.itbms || 0),
    total: Number(data.total || 0),
    metodoPago: normalizeMetodoPago(data.metodoPago || data.metodo_pago),
    montoRecibido: Number(data.montoRecibido ?? data.monto_recibido ?? 0),
    cambio: Number(data.cambio || 0),
    usuario: data.usuario || 'Cajero',
    cajeroJornada: data.cajeroJornada || data.cajero_jornada || '',
    tipoVenta: data.tipoVenta || data.tipo_venta || 'local',
    anulada: Boolean(data.anulada),
    motivoAnulacion: data.motivoAnulacion || data.motivo_anulacion || '',
    fechaAnulacion: data.fechaAnulacion || data.fecha_anulacion || undefined,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
  };
}

function getLocalVentas(): Venta[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const deletedIds = getDeletedVentasIds();
        const cleaned = parsed.filter(
          (v: Venta) => v && v.id && !v.id.startsWith('vta-2026-') && !deletedIds.has(v.id)
        );
        return deduplicateById(cleaned.map((v) => normalizeVenta(v.id!, v)));
      }
    }
  } catch (e) {
    console.warn('LocalStorage error reading ventas:', e);
  }
  return [];
}

function saveLocalVentas(items: Venta[]) {
  try {
    const unique = deduplicateById(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new Event('delicias_ventas_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving ventas:', e);
  }
}

export const ventasService = {
  subscribeToVentas(callback: (items: Venta[]) => void): () => void {
    const initial = getLocalVentas();
    callback(initial);

    const handler = () => callback(getLocalVentas());
    window.addEventListener('delicias_ventas_changed', handler);

    let supabaseChannel: any = null;

    const fetchFromSupabase = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data, error } = await client
          .from('ventas')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const deletedIds = getDeletedVentasIds();
          const list = data
            .map((r) => normalizeVenta(r.id, r))
            .filter((v) => v.id && !deletedIds.has(v.id));
          saveLocalVentas(list);
          callback(list);
        }
      } catch (e) {
        console.warn('Error fetching ventas from Supabase:', e);
      }
    };

    if (isSupabaseConfigured()) {
      fetchFromSupabase();

      const client = getSupabaseClient();
      if (client) {
        supabaseChannel = client
          .channel('ventas_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => {
            fetchFromSupabase();
          })
          .subscribe();
      }
    }

    const configListener = () => {
      if (isSupabaseConfigured()) fetchFromSupabase();
    };
    window.addEventListener('delicias_supabase_config_changed', configListener);

    return () => {
      window.removeEventListener('delicias_ventas_changed', handler);
      window.removeEventListener('delicias_supabase_config_changed', configListener);
      if (supabaseChannel) {
        const client = getSupabaseClient();
        if (client) client.removeChannel(supabaseChannel);
      }
    };
  },

  async getVentas(): Promise<Venta[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.from('ventas').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          const deletedIds = getDeletedVentasIds();
          return deduplicateById(
            data
              .map((r) => normalizeVenta(r.id, r))
              .filter((v) => v.id && !deletedIds.has(v.id))
          );
        }
      } catch (e) {
        console.warn('Error getting ventas from Supabase:', e);
      }
    }
    return getLocalVentas();
  },

  async registrarVenta(ventaData: Omit<Venta, 'id'>, allProductos: Producto[] = []): Promise<Venta> {
    const id = 'vta-' + Date.now();
    const nueva: Venta = {
      ...ventaData,
      id,
      numeroVenta: ventaData.numeroVenta || ventaData.numeroFactura || `#FAC-${id.slice(-4).toUpperCase()}`,
      numeroFactura: ventaData.numeroFactura || ventaData.numeroVenta || `#FAC-${id.slice(-4).toUpperCase()}`,
      createdAt: ventaData.createdAt || new Date().toISOString(),
    };

    // 1. Local update
    const current = getLocalVentas();
    current.unshift(nueva);
    saveLocalVentas(current);

    // 2. Reduce stock for sold items
    if (nueva.items && Array.isArray(nueva.items)) {
      for (const item of nueva.items) {
        const prod = allProductos.find((p) => p.id === item.productoId);
        if (prod && prod.id) {
          await inventarioService.registrarSalida(
            prod,
            item.cantidad,
            `Venta registrada ${nueva.numeroFactura}`,
            nueva.cajeroJornada || nueva.usuario || 'Cajero'
          );
        }
      }
    }

    // 3. Supabase insert
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('ventas')
        .insert({
          id,
          numero_factura: nueva.numeroFactura,
          fecha: nueva.fecha,
          hora: nueva.hora,
          items: nueva.items || [],
          subtotal: nueva.subtotal || 0,
          descuento: nueva.descuento || 0,
          itbms: nueva.itbms || 0,
          total: nueva.total || 0,
          metodo_pago: nueva.metodoPago,
          monto_recibido: nueva.montoRecibido || 0,
          cambio: nueva.cambio || 0,
          usuario: nueva.usuario,
          cajero_jornada: nueva.cajeroJornada,
          tipo_venta: nueva.tipoVenta,
          created_at: nueva.createdAt,
        })
        .then(
          () => {},
          (e: any) => console.warn('Supabase venta insert error:', e)
        );
    }

    return nueva;
  },

  async registrarVentaManual(
    ventaData: {
      items: VentaItem[];
      metodoPago?: MetodoPago;
      montoRecibido?: number;
      cambio?: number;
      descuento?: number;
      cajeroJornada?: string;
      usuario?: string;
    },
    allProductos: Producto[]
  ): Promise<Venta> {
    const subtotal = ventaData.items.reduce((acc, it) => acc + it.subtotal, 0);
    const itbms = 0;
    const descuento = ventaData.descuento || 0;
    const total = Math.max(0, subtotal - descuento + itbms);

    return this.registrarVenta(
      {
        numeroFactura: `#FAC-${Date.now().toString().slice(-4)}`,
        fecha: getPanamaTodayYMD(),
        hora: formatTimePanama(new Date().toISOString()),
        items: ventaData.items,
        subtotal,
        descuento,
        itbms,
        total,
        metodoPago: ventaData.metodoPago || 'Efectivo',
        montoRecibido: ventaData.montoRecibido || total,
        cambio: ventaData.cambio || 0,
        usuario: ventaData.usuario || 'Cajero',
        cajeroJornada: ventaData.cajeroJornada || '',
        tipoVenta: 'local',
        createdAt: new Date().toISOString(),
      },
      allProductos
    );
  },

  async anularVenta(id: string, motivo?: string, usuario: string = 'Administrador'): Promise<void> {
    const list = getLocalVentas();
    const idx = list.findIndex((v) => v.id === id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        anulada: true,
        motivoAnulacion: motivo || 'Venta anulada por usuario',
        fechaAnulacion: new Date().toISOString(),
        usuarioAnulacion: usuario,
      };
      saveLocalVentas(list);
    }

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('ventas')
        .update({
          anulada: true,
          motivo_anulacion: motivo || 'Venta anulada',
          fecha_anulacion: new Date().toISOString(),
        })
        .eq('id', id)
        .then(
          () => {},
          (e: any) => console.warn('Supabase anularVenta error:', e)
        );
    }
  },

  async deleteVenta(
    target: string | Venta,
    options?: { restaurarStock?: boolean; allProductos?: Producto[]; usuario?: string }
  ): Promise<void> {
    const id = typeof target === 'string' ? target : target.id;
    if (!id) return;

    addDeletedVentaId(id);

    // Optionally restore stock
    if (options?.restaurarStock && typeof target !== 'string' && target.items && options.allProductos) {
      for (const item of target.items) {
        const prod = options.allProductos.find((p) => p.id === item.productoId);
        if (prod && prod.id) {
          await inventarioService.registrarEntrada(
            prod,
            item.cantidad,
            `Restauración por venta eliminada (#${target.numeroFactura || target.id})`,
            options.usuario || 'Admin'
          );
        }
      }
    }

    const all = getLocalVentas().filter((v) => v.id !== id);
    saveLocalVentas(all);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured() && id) {
      client
        .from('ventas')
        .delete()
        .eq('id', id)
        .then(
          () => {},
          (e: any) => console.warn('Supabase deleteVenta error:', e)
        );
    }
  },

  async eliminarVenta(id: string): Promise<void> {
    return this.deleteVenta(id);
  },

  async clearAllVentas(): Promise<void> {
    const all = getLocalVentas();
    all.forEach((v) => {
      if (v.id) addDeletedVentaId(v.id);
    });
    saveLocalVentas([]);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('ventas')
        .delete()
        .neq('id', '')
        .then(
          () => {},
          (e: any) => console.warn('Supabase clearAllVentas error:', e)
        );
    }
  },

  getLocalVentas(): Venta[] {
    return getLocalVentas();
  },

  suscribirVentas(callback: (items: Venta[]) => void): () => void {
    return this.subscribeToVentas(callback);
  },
};
