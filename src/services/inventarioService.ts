import { MovimientoInventario, Producto, TipoMovimientoInventario } from '../types';
import { deduplicateById } from '../utils/deduplicate';
import { productosService } from './productosService';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'delicias_belgi_movimientos';

function getLocalMovimientos(): MovimientoInventario[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return deduplicateById(JSON.parse(saved));
  } catch (e) {
    console.warn('LocalStorage error reading movimientos:', e);
  }
  return [];
}

function saveLocalMovimientos(items: MovimientoInventario[]) {
  try {
    const unique = deduplicateById(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new Event('delicias_movimientos_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving movimientos:', e);
  }
}

function normalizeMovimiento(id: string, data: any): MovimientoInventario {
  const cantidadAnterior = Number(data.cantidadAnterior ?? data.cantidad_anterior ?? 0);
  const cantidadNueva = Number(data.cantidadNueva ?? data.cantidad_nueva ?? 0);
  const diferencia = Number(data.diferencia ?? (cantidadNueva - cantidadAnterior));
  const cantidad = Number(data.cantidad ?? Math.abs(diferencia));
  const prodId = String(data.productoId || data.producto_id || '');

  return {
    id,
    productoId: prodId,
    producto: String(data.producto || data.producto_nombre || 'Producto'),
    productoNombre: String(data.productoNombre || data.producto_nombre || data.producto || 'Producto'),
    cantidadAnterior,
    cantidadNueva,
    diferencia,
    cantidad,
    tipo: (data.tipo || 'ajuste') as TipoMovimientoInventario,
    motivo: String(data.motivo || ''),
    usuario: String(data.usuario || 'Sistema'),
    fecha: data.fecha || new Date().toISOString(),
  };
}

export const inventarioService = {
  subscribeToMovimientos(callback: (items: MovimientoInventario[]) => void): () => void {
    const initial = getLocalMovimientos();
    callback(initial);

    const handler = () => callback(getLocalMovimientos());
    window.addEventListener('delicias_movimientos_changed', handler);

    let supabaseChannel: any = null;

    const fetchFromSupabase = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data, error } = await client
          .from('inventario_movimientos')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(100);

        if (!error && Array.isArray(data)) {
          const list = data.map((r) => normalizeMovimiento(r.id, r));
          saveLocalMovimientos(list);
          callback(list);
        }
      } catch (e) {
        console.warn('Error fetching inventario movimientos from Supabase:', e);
      }
    };

    if (isSupabaseConfigured()) {
      fetchFromSupabase();

      const client = getSupabaseClient();
      if (client) {
        supabaseChannel = client
          .channel('movimientos_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario_movimientos' }, () => {
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
      window.removeEventListener('delicias_movimientos_changed', handler);
      window.removeEventListener('delicias_supabase_config_changed', configListener);
      if (supabaseChannel) {
        const client = getSupabaseClient();
        if (client) client.removeChannel(supabaseChannel);
      }
    };
  },

  async registrarMovimiento(
    movimiento: Omit<MovimientoInventario, 'id'>,
    productoActual?: Producto
  ): Promise<MovimientoInventario> {
    const id = 'mov-' + Date.now();
    const prodId = movimiento.productoId || productoActual?.id || 'prod-gen';
    const prodNombre =
      movimiento.productoNombre || movimiento.producto || productoActual?.nombre || 'Producto';

    const nuevo: MovimientoInventario = {
      ...movimiento,
      id,
      productoId: prodId,
      producto: prodNombre,
      productoNombre: prodNombre,
      fecha: movimiento.fecha || new Date().toISOString(),
    };

    // 1. Local update
    const current = getLocalMovimientos();
    current.unshift(nuevo);
    saveLocalMovimientos(current);

    // 2. Update product stock if provided
    if (productoActual && productoActual.id) {
      await productosService.updateProducto(productoActual.id, {
        stock: nuevo.cantidadNueva,
      });
    }

    // 3. Supabase insert
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('inventario_movimientos')
        .insert({
          id,
          producto_id: prodId,
          producto: prodNombre,
          producto_nombre: prodNombre,
          tipo: nuevo.tipo,
          cantidad: nuevo.cantidad,
          cantidad_anterior: nuevo.cantidadAnterior,
          cantidad_nueva: nuevo.cantidadNueva,
          diferencia: nuevo.diferencia,
          motivo: nuevo.motivo,
          usuario: nuevo.usuario,
          fecha: nuevo.fecha,
        })
        .then(
          ({ error }) => {
            if (error) console.warn('Supabase movimiento insert error:', error);
          },
          (e: any) => console.warn('Supabase movimiento exception:', e)
        );
    }

    return nuevo;
  },

  async registrarEntrada(
    producto: Producto,
    cantidad: number,
    motivo?: string,
    usuario: string = 'Administrador'
  ): Promise<void> {
    const stockActual = Number(producto.stock) || 0;
    const nuevoStock = stockActual + Math.abs(cantidad);
    await this.registrarMovimiento(
      {
        productoId: producto.id!,
        producto: producto.nombre,
        productoNombre: producto.nombre,
        cantidadAnterior: stockActual,
        cantidadNueva: nuevoStock,
        diferencia: Math.abs(cantidad),
        cantidad: Math.abs(cantidad),
        tipo: 'entrada',
        motivo: motivo || 'Entrada manual de inventario',
        usuario,
        fecha: new Date().toISOString(),
      },
      producto
    );
  },

  async registrarSalida(
    producto: Producto,
    cantidad: number,
    motivo?: string,
    usuario: string = 'Administrador'
  ): Promise<void> {
    const stockActual = Number(producto.stock) || 0;
    const nuevoStock = Math.max(0, stockActual - Math.abs(cantidad));
    await this.registrarMovimiento(
      {
        productoId: producto.id!,
        producto: producto.nombre,
        productoNombre: producto.nombre,
        cantidadAnterior: stockActual,
        cantidadNueva: nuevoStock,
        diferencia: -Math.abs(cantidad),
        cantidad: Math.abs(cantidad),
        tipo: 'salida',
        motivo: motivo || 'Salida manual de inventario',
        usuario,
        fecha: new Date().toISOString(),
      },
      producto
    );
  },

  async registrarAjuste(
    producto: Producto,
    nuevoStock: number,
    motivo?: string,
    usuario: string = 'Administrador'
  ): Promise<void> {
    const stockActual = Number(producto.stock) || 0;
    const diff = nuevoStock - stockActual;
    await this.registrarMovimiento(
      {
        productoId: producto.id!,
        producto: producto.nombre,
        productoNombre: producto.nombre,
        cantidadAnterior: stockActual,
        cantidadNueva: nuevoStock,
        diferencia: diff,
        cantidad: Math.abs(diff),
        tipo: 'ajuste',
        motivo: motivo || 'Corrección manual de cantidad',
        usuario,
        fecha: new Date().toISOString(),
      },
      producto
    );
  },

  async ajustarStock(producto: Producto, nuevoStock: number, motivo: string, usuarioEmail?: string): Promise<void> {
    return this.registrarAjuste(producto, nuevoStock, motivo, usuarioEmail);
  },
  async agregarStock(producto: Producto, cantidad: number, motivo?: string, usuarioEmail?: string): Promise<void> {
    return this.registrarEntrada(producto, cantidad, motivo, usuarioEmail);
  },
  async reducirStock(producto: Producto, cantidad: number, motivo?: string, usuarioEmail?: string): Promise<void> {
    return this.registrarSalida(producto, cantidad, motivo, usuarioEmail);
  },

  async registrarDesperdicio(
    producto: Producto,
    cantidad: number,
    motivo?: string,
    usuario: string = 'Administrador'
  ): Promise<void> {
    const stockActual = Number(producto.stock) || 0;
    const nuevoStock = Math.max(0, stockActual - Math.abs(cantidad));
    await this.registrarMovimiento(
      {
        productoId: producto.id!,
        producto: producto.nombre,
        productoNombre: producto.nombre,
        cantidadAnterior: stockActual,
        cantidadNueva: nuevoStock,
        diferencia: -Math.abs(cantidad),
        cantidad: Math.abs(cantidad),
        tipo: 'merma' as TipoMovimientoInventario,
        motivo: motivo || 'Merma / Producto dañado',
        usuario,
        fecha: new Date().toISOString(),
      },
      producto
    );
  },

  async sincronizarInventarioConFirestore(productos: Producto[]): Promise<void> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return;
    const rows = productos.map((p) => ({
      id: p.id!,
      nombre: p.nombre,
      stock: Number(p.stock) || 0,
      stock_minimo: Number(p.stockMinimo) || 0,
      precio: Number(p.precio) || 0,
      updated_at: new Date().toISOString(),
    }));
    await client.from('productos').upsert(rows, { onConflict: 'id' });
  },

  async sincronizarInventarioConSupabase(productos: Producto[]): Promise<void> {
    return this.sincronizarInventarioConFirestore(productos);
  },

  async deleteMovimiento(id: string): Promise<void> {
    const local = getLocalMovimientos();
    const filtered = local.filter((m) => m.id !== id);
    saveLocalMovimientos(filtered);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured() && id) {
      client
        .from('inventario_movimientos')
        .delete()
        .eq('id', id)
        .then(() => {}, () => {});
    }
  },

  async eliminarMovimiento(id: string): Promise<void> {
    return this.deleteMovimiento(id);
  },

  async clearAllMovimientos(): Promise<void> {
    saveLocalMovimientos([]);
  },

  suscribirMovimientos(callback: (items: MovimientoInventario[]) => void): () => void {
    return this.subscribeToMovimientos(callback);
  },

  getLocalMovimientos(): MovimientoInventario[] {
    return getLocalMovimientos();
  },
};
