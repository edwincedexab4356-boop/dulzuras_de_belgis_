import { Producto } from '../types';
import { deduplicateById } from '../utils/deduplicate';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'delicias_belgi_productos';
const DELETED_PRODUCTS_KEY = 'delicias_belgi_deleted_products';

function getDeletedProductIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function recordDeletedProductId(id: string) {
  try {
    const set = getDeletedProductIds();
    set.add(id);
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error recording deleted product id:', e);
  }
}

function normalizeProducto(id: string, data: any): Producto {
  const isDisp =
    data.disponible !== undefined
      ? Boolean(data.disponible)
      : data.activo !== undefined
      ? Boolean(data.activo)
      : true;

  return {
    id,
    nombre: data.nombre || data.name || 'Producto',
    descripcion: data.descripcion || data.description || '',
    precio: Number(data.precio || data.price || 0),
    costo: data.costo !== undefined ? Number(data.costo) : 0,
    categoria: data.categoria || data.category || 'Dulcería',
    imagen:
      data.imagen ||
      data.image ||
      'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&q=80&w=800',
    disponible: isDisp,
    activo: isDisp,
    stock: data.stock !== undefined ? Number(data.stock) : 0,
    stockMinimo:
      data.stock_minimo !== undefined
        ? Number(data.stock_minimo)
        : data.stockMinimo !== undefined
        ? Number(data.stockMinimo)
        : 0,
    totalProducido: data.total_producido !== undefined ? Number(data.total_producido) : data.totalProducido,
    totalVendido: data.total_vendido !== undefined ? Number(data.total_vendido) : data.totalVendido,
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
  };
}

function getLocalProductos(): Producto[] {
  const deletedIds = getDeletedProductIds();
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: any[] = JSON.parse(saved);
      const filtered = parsed
        .map((p, i) => normalizeProducto(p.id || `local-${i}`, p))
        .filter((p) => !deletedIds.has(p.id!));
      return deduplicateById(filtered);
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return [];
}

function saveLocalProductos(items: Producto[]) {
  try {
    const unique = deduplicateById(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new Event('delicias_productos_changed'));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

export const productosService = {
  subscribeToProductos(callback: (items: Producto[]) => void): () => void {
    // 1. Emit local data immediately
    const initialLocal = getLocalProductos();
    callback(initialLocal);

    // 2. Listen to local changes for instant optimistic UI
    const handler = () => callback(getLocalProductos());
    window.addEventListener('delicias_productos_changed', handler);

    let supabaseChannel: any = null;

    const fetchFromSupabase = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data, error } = await client.from('productos').select('*').order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          const deletedIds = getDeletedProductIds();
          const items = data
            .map((row) => normalizeProducto(row.id, row))
            .filter((p) => !deletedIds.has(p.id!));
          saveLocalProductos(items);
          callback(items);
        }
      } catch (e) {
        console.warn('Error fetching productos from Supabase:', e);
      }
    };

    if (isSupabaseConfigured()) {
      fetchFromSupabase();

      const client = getSupabaseClient();
      if (client) {
        supabaseChannel = client
          .channel('productos_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
            fetchFromSupabase();
          })
          .subscribe();
      }
    }

    const configListener = () => {
      if (isSupabaseConfigured()) {
        fetchFromSupabase();
      }
    };
    window.addEventListener('delicias_supabase_config_changed', configListener);

    return () => {
      window.removeEventListener('delicias_productos_changed', handler);
      window.removeEventListener('delicias_supabase_config_changed', configListener);
      if (supabaseChannel) {
        const client = getSupabaseClient();
        if (client) client.removeChannel(supabaseChannel);
      }
    };
  },

  async getProductosActivos(): Promise<Producto[]> {
    const deletedIds = getDeletedProductIds();
    const client = getSupabaseClient();

    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('productos')
          .select('*')
          .eq('disponible', true)
          .eq('activo', true);

        if (!error && data) {
          const list = data
            .map((r) => normalizeProducto(r.id, r))
            .filter((p) => !deletedIds.has(p.id!));
          return deduplicateById(list);
        }
      } catch (err) {
        console.warn('Error fetching activos from Supabase:', err);
      }
    }

    const local = getLocalProductos();
    return deduplicateById(local.filter((p) => p.disponible !== false && p.activo !== false));
  },

  async getAllProductos(): Promise<Producto[]> {
    const deletedIds = getDeletedProductIds();
    const client = getSupabaseClient();

    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.from('productos').select('*');
        if (!error && data) {
          const list = data
            .map((r) => normalizeProducto(r.id, r))
            .filter((p) => !deletedIds.has(p.id!));
          return deduplicateById(list);
        }
      } catch (err) {
        console.warn('Error fetching all from Supabase:', err);
      }
    }

    return getLocalProductos();
  },

  async createProducto(producto: Omit<Producto, 'id'>): Promise<Producto> {
    const now = new Date().toISOString();
    const isDisp =
      producto.disponible !== undefined
        ? Boolean(producto.disponible)
        : producto.activo !== undefined
        ? Boolean(producto.activo)
        : true;

    const id = 'prod-' + Date.now();
    const created: Producto = {
      ...producto,
      id,
      nombre: producto.nombre.trim(),
      descripcion: producto.descripcion ? producto.descripcion.trim() : '',
      precio: Number(producto.precio) || 0,
      costo: producto.costo !== undefined ? Number(producto.costo) : 0,
      categoria: producto.categoria?.trim() || 'Dulcería',
      imagen:
        producto.imagen?.trim() ||
        'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=600&q=80',
      disponible: isDisp,
      activo: isDisp,
      stock: producto.stock !== undefined ? Number(producto.stock) : 0,
      stockMinimo: producto.stockMinimo !== undefined ? Number(producto.stockMinimo) : 0,
      createdAt: producto.createdAt || now,
      updatedAt: now,
    };

    // 1. Instant local update
    const list = getLocalProductos().filter((p) => p.id !== id);
    list.unshift(created);
    saveLocalProductos(list);

    // 2. Parallel background sync with Supabase
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('productos')
        .insert({
          id,
          nombre: created.nombre,
          descripcion: created.descripcion,
          precio: created.precio,
          costo: created.costo,
          categoria: created.categoria,
          imagen: created.imagen,
          disponible: created.disponible,
          activo: created.activo,
          stock: created.stock,
          stock_minimo: created.stockMinimo,
          created_at: created.createdAt,
          updated_at: created.updatedAt,
        })
        .then(
          ({ error }) => {
            if (error) console.warn('Supabase product insert error:', error);
          },
          (e) => console.warn('Supabase product insert exception:', e)
        );
    }

    return created;
  },

  async updateProducto(id: string, updates: Partial<Producto>): Promise<void> {
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      ...updates,
      updatedAt: now,
    };
    if (updates.disponible !== undefined) {
      updatePayload.activo = updates.disponible;
    } else if (updates.activo !== undefined) {
      updatePayload.disponible = updates.activo;
    }
    if (updates.precio !== undefined) {
      updatePayload.precio = Number(updates.precio) || 0;
    }
    if (updates.stock !== undefined) {
      updatePayload.stock = Math.max(0, Number(updates.stock));
    }
    if (updates.stockMinimo !== undefined) {
      updatePayload.stockMinimo = Math.max(0, Number(updates.stockMinimo));
    }

    // 1. Instant local update
    const list = getLocalProductos();
    const index = list.findIndex((p) => p.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatePayload };
      saveLocalProductos(list);
    }

    // 2. Parallel Supabase update
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const dbRow: Record<string, any> = { updated_at: now };
      if (updatePayload.nombre !== undefined) dbRow.nombre = updatePayload.nombre;
      if (updatePayload.descripcion !== undefined) dbRow.descripcion = updatePayload.descripcion;
      if (updatePayload.precio !== undefined) dbRow.precio = updatePayload.precio;
      if (updatePayload.costo !== undefined) dbRow.costo = updatePayload.costo;
      if (updatePayload.categoria !== undefined) dbRow.categoria = updatePayload.categoria;
      if (updatePayload.imagen !== undefined) dbRow.imagen = updatePayload.imagen;
      if (updatePayload.disponible !== undefined) dbRow.disponible = updatePayload.disponible;
      if (updatePayload.activo !== undefined) dbRow.activo = updatePayload.activo;
      if (updatePayload.stock !== undefined) dbRow.stock = updatePayload.stock;
      if (updatePayload.stockMinimo !== undefined) dbRow.stock_minimo = updatePayload.stockMinimo;

      client
        .from('productos')
        .update(dbRow)
        .eq('id', id)
        .then(
          ({ error }) => {
            if (error) console.warn('Supabase product update error:', error);
          },
          (e) => console.warn('Supabase product update exception:', e)
        );
    }
  },

  async toggleActivo(id: string, currentStatus: boolean): Promise<void> {
    await this.updateProducto(id, { disponible: !currentStatus, activo: !currentStatus });
  },

  async deleteProducto(id: string): Promise<{ success: boolean; deletedInSupabase: boolean; deletedInFirebase: boolean }> {
    recordDeletedProductId(id);

    const list = getLocalProductos();
    const filtered = list.filter((p) => p.id !== id);
    saveLocalProductos(filtered);

    let deletedInSupabase = false;
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured() && id) {
      try {
        const { error } = await client.from('productos').delete().eq('id', id);
        if (!error) deletedInSupabase = true;
      } catch (e) {
        console.warn('Supabase delete error:', e);
      }
    }

    return { success: true, deletedInSupabase, deletedInFirebase: deletedInSupabase };
  },

  async crearProducto(producto: Omit<Producto, 'id'>): Promise<Producto> {
    return this.createProducto(producto);
  },
  async actualizarProducto(id: string, updates: Partial<Producto>): Promise<void> {
    return this.updateProducto(id, updates);
  },
  async eliminarProducto(id: string): Promise<{ success: boolean; deletedInSupabase: boolean; deletedInFirebase: boolean }> {
    return this.deleteProducto(id);
  },
  async duplicarProducto(producto: Producto): Promise<Producto> {
    const copyData: Omit<Producto, 'id'> = {
      nombre: `${producto.nombre} (Copia)`,
      descripcion: producto.descripcion || '',
      precio: Number(producto.precio) || 0,
      categoria: producto.categoria || 'Dulcería',
      imagen: producto.imagen || '',
      disponible: producto.disponible !== undefined ? producto.disponible : true,
      activo: producto.activo !== undefined ? producto.activo : true,
      stock: producto.stock !== undefined ? Number(producto.stock) : 0,
      stockMinimo: producto.stockMinimo !== undefined ? Number(producto.stockMinimo) : 0,
    };
    return this.createProducto(copyData);
  },
  subscribeProductos(callback: (items: Producto[]) => void): () => void {
    return this.subscribeToProductos(callback);
  },
  suscribirProductos(callback: (items: Producto[]) => void): () => void {
    return this.subscribeToProductos(callback);
  },
  async getProductoById(id: string): Promise<Producto | null> {
    const all = await this.getAllProductos();
    return all.find((p) => p.id === id) || null;
  },
  limpiarTodosLosProductos(): void {
    saveLocalProductos([]);
  },
  async eliminarTodosLosProductos(): Promise<void> {
    const list = getLocalProductos();
    for (const p of list) {
      if (p.id) recordDeletedProductId(p.id);
    }
    saveLocalProductos([]);
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        await client.from('productos').delete().neq('id', 'dummy_id');
      } catch (e) {
        console.warn('Error clearing Supabase products:', e);
      }
    }
  },
  getLocalProductos(): Producto[] {
    return getLocalProductos();
  },
};
