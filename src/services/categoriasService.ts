import { Categoria } from '../types';
import { deduplicateById } from '../utils/deduplicate';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'delicias_belgi_categorias';
const DELETED_CATEGORIAS_KEY = 'delicias_belgi_deleted_categorias';

const INITIAL_CATEGORIAS: Categoria[] = [
  { id: 'cat-1', nombre: 'Dulcería', descripcion: 'Alfajores, brownies y bocadillos dulces', activa: true, orden: 1 },
  { id: 'cat-2', nombre: 'Repostería', descripcion: 'Tartas, cheesecakes y pasteles finos', activa: true, orden: 2 },
  { id: 'cat-3', nombre: 'Postres Especiales', descripcion: 'Creaciones artesanales de la casa', activa: true, orden: 3 },
  { id: 'cat-4', nombre: 'Bebidas', descripcion: 'Café, sodas y jugos naturales', activa: true, orden: 4 },
  { id: 'cat-5', nombre: 'Combos & Especiales', descripcion: 'Paquetes para compartir y creaciones de temporada', activa: true, orden: 5 },
];

function getDeletedCategoriaIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CATEGORIAS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function recordDeletedCategoriaId(id: string) {
  try {
    const set = getDeletedCategoriaIds();
    set.add(id);
    localStorage.setItem(DELETED_CATEGORIAS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error recording deleted categoria id:', e);
  }
}

function getLocalCategorias(): Categoria[] {
  const deletedIds = getDeletedCategoriaIds();
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved !== null) {
      const parsed: Categoria[] = JSON.parse(saved);
      return deduplicateById(parsed.filter((c) => !c.id || !deletedIds.has(c.id)));
    }
  } catch (e) {
    console.warn('LocalStorage error reading categorias:', e);
  }
  return deduplicateById(INITIAL_CATEGORIAS.filter((c) => !c.id || !deletedIds.has(c.id)));
}

function saveLocalCategorias(items: Categoria[]) {
  try {
    const unique = deduplicateById(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new Event('delicias_categorias_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving categorias:', e);
  }
}

export const categoriasService = {
  subscribeToCategorias(callback: (items: Categoria[]) => void): () => void {
    const initialLocal = getLocalCategorias();
    callback(initialLocal);

    const handler = () => callback(getLocalCategorias());
    window.addEventListener('delicias_categorias_changed', handler);

    let supabaseChannel: any = null;

    const fetchFromSupabase = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data, error } = await client.from('categorias').select('*').order('orden', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          const deletedIds = getDeletedCategoriaIds();
          const items: Categoria[] = data
            .map((row) => ({
              id: row.id,
              nombre: row.nombre,
              descripcion: row.descripcion || '',
              imagen: row.imagen || '',
              activa: row.activa !== false,
              orden: Number(row.orden) || 1,
            }))
            .filter((c) => !deletedIds.has(c.id));
          saveLocalCategorias(items);
          callback(items);
        }
      } catch (e) {
        console.warn('Error fetching categorias from Supabase:', e);
      }
    };

    if (isSupabaseConfigured()) {
      fetchFromSupabase();

      const client = getSupabaseClient();
      if (client) {
        supabaseChannel = client
          .channel('categorias_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, () => {
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
      window.removeEventListener('delicias_categorias_changed', handler);
      window.removeEventListener('delicias_supabase_config_changed', configListener);
      if (supabaseChannel) {
        const client = getSupabaseClient();
        if (client) client.removeChannel(supabaseChannel);
      }
    };
  },

  async getCategorias(): Promise<Categoria[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.from('categorias').select('*').order('orden', { ascending: true });
        if (!error && data && data.length > 0) {
          const deletedIds = getDeletedCategoriaIds();
          return deduplicateById(
            data
              .map((r) => ({
                id: r.id,
                nombre: r.nombre,
                descripcion: r.descripcion || '',
                imagen: r.imagen || '',
                activa: r.activa !== false,
                orden: Number(r.orden) || 1,
              }))
              .filter((c) => !deletedIds.has(c.id))
          );
        }
      } catch (e) {
        console.warn('Error getting categorias from Supabase:', e);
      }
    }
    return getLocalCategorias();
  },

  async createCategoria(cat: Omit<Categoria, 'id'>): Promise<Categoria> {
    const id = 'cat-' + Date.now();
    const newCat: Categoria = {
      ...cat,
      id,
      nombre: cat.nombre.trim(),
      descripcion: cat.descripcion?.trim() || '',
      imagen: cat.imagen?.trim() || '',
      activa: cat.activa !== false,
      orden: Number(cat.orden) || 1,
    };

    const current = getLocalCategorias();
    current.push(newCat);
    saveLocalCategorias(current);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('categorias')
        .insert({
          id,
          nombre: newCat.nombre,
          descripcion: newCat.descripcion,
          imagen: newCat.imagen,
          activa: newCat.activa,
          orden: newCat.orden,
        })
        .then(
          ({ error }) => {
            if (error) console.warn('Supabase categoria insert error:', error);
          },
          (e: any) => console.warn('Supabase categoria exception:', e)
        );
    }

    return newCat;
  },

  async updateCategoria(id: string, updates: Partial<Categoria>): Promise<void> {
    const current = getLocalCategorias();
    const index = current.findIndex((c) => c.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      saveLocalCategorias(current);
    }

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const payload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.nombre !== undefined) payload.nombre = updates.nombre;
      if (updates.descripcion !== undefined) payload.descripcion = updates.descripcion;
      if (updates.imagen !== undefined) payload.imagen = updates.imagen;
      if (updates.activa !== undefined) payload.activa = updates.activa;
      if (updates.orden !== undefined) payload.orden = Number(updates.orden);

      client
        .from('categorias')
        .update(payload)
        .eq('id', id)
        .then(
          ({ error }) => {
            if (error) console.warn('Supabase categoria update error:', error);
          },
          (e: any) => console.warn('Supabase categoria update exception:', e)
        );
    }
  },

  async deleteCategoria(id: string): Promise<{ success: boolean; deletedInSupabase: boolean; deletedInFirebase: boolean }> {
    recordDeletedCategoriaId(id);
    const current = getLocalCategorias().filter((c) => c.id !== id);
    saveLocalCategorias(current);

    let deletedInSupabase = false;
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { error } = await client.from('categorias').delete().eq('id', id);
        if (!error) deletedInSupabase = true;
      } catch (e) {
        console.warn('Error deleting categoria from Supabase:', e);
      }
    }
    return { success: true, deletedInSupabase, deletedInFirebase: deletedInSupabase };
  },

  async sincronizarCategoriasConSupabase(items?: Categoria[]): Promise<void> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return;
    const list = items && items.length > 0 ? items : getLocalCategorias();
    const rows = list.map((c) => ({
      id: c.id!,
      nombre: c.nombre,
      descripcion: c.descripcion || '',
      imagen: c.imagen || '',
      activa: c.activa !== false,
      orden: Number(c.orden) || 1,
      updated_at: new Date().toISOString(),
    }));
    await client.from('categorias').upsert(rows, { onConflict: 'id' });
  },
  async sincronizarCategoriasConFirestore(items?: Categoria[]): Promise<void> {
    return this.sincronizarCategoriasConSupabase(items);
  },

  subscribeCategorias(callback: (items: Categoria[]) => void): () => void {
    return this.subscribeToCategorias(callback);
  },
  suscribirCategorias(callback: (items: Categoria[]) => void): () => void {
    return this.subscribeToCategorias(callback);
  },
  async crearCategoria(cat: Omit<Categoria, 'id'>): Promise<Categoria> {
    return this.createCategoria(cat);
  },
  async actualizarCategoria(id: string, updates: Partial<Categoria>): Promise<void> {
    return this.updateCategoria(id, updates);
  },
  async eliminarCategoria(id: string): Promise<{ success: boolean; deletedInSupabase: boolean; deletedInFirebase: boolean }> {
    return this.deleteCategoria(id);
  },
  getLocalCategorias(): Categoria[] {
    return getLocalCategorias();
  },
};
