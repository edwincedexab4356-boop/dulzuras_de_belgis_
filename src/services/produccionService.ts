import { ProduccionRegistro, Producto } from '../types';
import { deduplicateById } from '../utils/deduplicate';
import { inventarioService } from './inventarioService';
import { productosService } from './productosService';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'delicias_belgi_producciones';

function normalizeProduccion(id: string, data: any): ProduccionRegistro {
  const cantidad = Math.max(0, Number(data.cantidad) || 0);
  const costoUnitario =
    data.costoUnitario !== undefined
      ? Number(data.costoUnitario)
      : data.costo_unitario !== undefined
      ? Number(data.costo_unitario)
      : 0.85;
  const costoTotal =
    data.costoTotal !== undefined
      ? Number(data.costoTotal)
      : data.costo_total !== undefined
      ? Number(data.costo_total)
      : Math.round(costoUnitario * cantidad * 100) / 100;

  return {
    id,
    productoId: String(data.productoId || data.producto_id || ''),
    producto: String(data.producto || data.productoNombre || 'Producto Elaborado'),
    cantidad,
    costoUnitario,
    costoTotal,
    fecha: data.fecha || new Date().toISOString().split('T')[0],
    hora: data.hora || '12:00',
    responsable: data.responsable || 'Administrador',
    notas: data.notas || '',
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
  };
}

function getLocalProducciones(): ProduccionRegistro[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return deduplicateById(parsed.map((p, i) => normalizeProduccion(p.id || `loc-${i}`, p)));
      }
    }
  } catch (e) {
    console.warn('LocalStorage error reading producciones:', e);
  }
  return [];
}

function saveLocalProducciones(items: ProduccionRegistro[]) {
  try {
    const unique = deduplicateById(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new Event('delicias_producciones_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving producciones:', e);
  }
}

export const produccionService = {
  subscribeToProducciones(callback: (items: ProduccionRegistro[]) => void): () => void {
    const initial = getLocalProducciones();
    callback(initial);

    const handler = () => callback(getLocalProducciones());
    window.addEventListener('delicias_producciones_changed', handler);

    let supabaseChannel: any = null;

    const fetchFromSupabase = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data, error } = await client
          .from('producciones')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const list = data.map((r) => normalizeProduccion(r.id, r));
          saveLocalProducciones(list);
          callback(list);
        }
      } catch (e) {
        console.warn('Error fetching producciones from Supabase:', e);
      }
    };

    if (isSupabaseConfigured()) {
      fetchFromSupabase();

      const client = getSupabaseClient();
      if (client) {
        supabaseChannel = client
          .channel('producciones_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'producciones' }, () => {
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
      window.removeEventListener('delicias_producciones_changed', handler);
      window.removeEventListener('delicias_supabase_config_changed', configListener);
      if (supabaseChannel) {
        const client = getSupabaseClient();
        if (client) client.removeChannel(supabaseChannel);
      }
    };
  },

  subscribeToProduccion(callback: (items: ProduccionRegistro[]) => void): () => void {
    return this.subscribeToProducciones(callback);
  },

  async registrarProduccion(
    produccionData: Omit<ProduccionRegistro, 'id'>,
    producto?: Producto,
    usuario: string = 'Administrador'
  ): Promise<ProduccionRegistro> {
    const id = 'prod-rec-' + Date.now();
    const nueva: ProduccionRegistro = {
      ...produccionData,
      id,
      createdAt: new Date().toISOString(),
    };

    // 1. Local storage
    const current = getLocalProducciones();
    current.unshift(nueva);
    saveLocalProducciones(current);

    // 2. Adjust inventory automatically
    if (producto) {
      await inventarioService.registrarEntrada(
        producto,
        nueva.cantidad,
        `Producción elaborada por ${usuario}: ${nueva.notas || 'Lote terminado'}`,
        usuario
      );
    }

    // 3. Supabase insert
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('producciones')
        .insert({
          id,
          producto_id: nueva.productoId,
          producto: nueva.producto,
          cantidad: nueva.cantidad,
          costo_unitario: nueva.costoUnitario,
          costo_total: nueva.costoTotal,
          fecha: nueva.fecha,
          hora: nueva.hora,
          responsable: nueva.responsable,
          notas: nueva.notas,
          created_at: nueva.createdAt,
        })
        .then(
          ({ error }) => {
            if (error) console.warn('Supabase produccion insert error:', error);
          },
          (e: any) => console.warn('Supabase produccion exception:', e)
        );
    }

    return nueva;
  },

  async eliminarProduccion(
    produccion: ProduccionRegistro,
    producto?: Producto,
    usuario: string = 'Administrador'
  ): Promise<void> {
    // Revert inventory
    if (producto) {
      await inventarioService.registrarSalida(
        producto,
        produccion.cantidad,
        `Reversión de producción eliminada (ID: ${produccion.id})`,
        usuario
      );
    }

    const all = getLocalProducciones();
    const filtered = all.filter((p) => p.id !== produccion.id);
    saveLocalProducciones(filtered);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured() && produccion.id) {
      client
        .from('producciones')
        .delete()
        .eq('id', produccion.id)
        .then(() => {}, () => {});
    }
  },

  async deleteProduccion(id: string, producto?: Producto, usuario: string = 'Administrador'): Promise<void> {
    const all = getLocalProducciones();
    const target = all.find((p) => p.id === id);
    if (target) {
      return this.eliminarProduccion(target, producto, usuario);
    }
    saveLocalProducciones(all.filter((p) => p.id !== id));
  },

  async clearAllProducciones(): Promise<void> {
    saveLocalProducciones([]);
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('producciones')
        .delete()
        .neq('id', '')
        .then(() => {}, () => {});
    }
  },

  getLocalProducciones(): ProduccionRegistro[] {
    return getLocalProducciones();
  },

  async getProducciones(): Promise<ProduccionRegistro[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.from('producciones').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return deduplicateById(data.map((r) => normalizeProduccion(r.id, r)));
        }
      } catch (e) {
        console.warn('Error fetching producciones from Supabase:', e);
      }
    }
    return getLocalProducciones();
  },
};
