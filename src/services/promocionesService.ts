import { Promocion } from '../types';
import { deduplicateById } from '../utils/deduplicate';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'delicias_belgi_promociones';
const DELETED_PROMO_KEY = 'delicias_belgi_deleted_promociones';

export const INITIAL_PROMOCIONES: Promocion[] = [];

function getDeletedPromoIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PROMO_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set<string>(parsed);
    // Ensure sample promos are marked deleted
    set.add('promo-1');
    set.add('promo-2');
    return set;
  } catch {
    return new Set<string>(['promo-1', 'promo-2']);
  }
}

function recordDeletedPromoId(id: string) {
  try {
    const set = getDeletedPromoIds();
    set.add(id);
    localStorage.setItem(DELETED_PROMO_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error recording deleted promo id:', e);
  }
}

function getLocalPromociones(): Promocion[] {
  const deletedIds = getDeletedPromoIds();
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved !== null) {
      const parsed: Promocion[] = JSON.parse(saved);
      return deduplicateById(
        parsed.filter((p) => p.id && !deletedIds.has(p.id) && p.id !== 'promo-1' && p.id !== 'promo-2')
      );
    }
  } catch (e) {
    console.warn('LocalStorage error reading promociones:', e);
  }
  return [];
}

function saveLocalPromociones(items: Promocion[]) {
  try {
    const unique = deduplicateById(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new Event('delicias_promociones_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving promociones:', e);
  }
}

export const promocionesService = {
  subscribeToPromociones(callback: (items: Promocion[]) => void): () => void {
    // 1. Initial local load
    callback(getLocalPromociones());

    // 2. Local storage event listener
    const handleStorageOrLocal = () => {
      callback(getLocalPromociones());
    };
    window.addEventListener('storage', handleStorageOrLocal);
    window.addEventListener('delicias_promociones_changed', handleStorageOrLocal);

    // 3. Supabase Realtime sync if configured
    let channel: any = null;
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('promociones')
        .select('*')
        .order('orden', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const mapped: Promocion[] = data.map((d: any) => ({
              id: d.id,
              titulo: d.titulo || '',
              subtitulo: d.subtitulo || '',
              descripcion: d.descripcion || '',
              descuentoPorcentaje: Number(d.descuento_porcentaje || 0),
              precioOferta: Number(d.precio_oferta || 0),
              precioRegular: Number(d.precio_regular || 0),
              etiqueta: d.etiqueta || 'OFERTA',
              imagen: d.imagen || '',
              productoId: d.producto_id || '',
              activa: d.activa !== false,
              mostrarModalInicio: d.mostrar_modal_inicio !== false,
              fechaInicio: d.fecha_inicio || '',
              fechaFin: d.fecha_fin || '',
              orden: Number(d.orden || 1),
              createdAt: d.created_at,
              updatedAt: d.updated_at,
            }));
            saveLocalPromociones(mapped);
            callback(mapped);
          }
        });

      try {
        channel = client
          .channel('public:promociones')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'promociones' },
            async () => {
              const { data } = await client
                .from('promociones')
                .select('*')
                .order('orden', { ascending: true });
              if (data) {
                const mapped: Promocion[] = data.map((d: any) => ({
                  id: d.id,
                  titulo: d.titulo || '',
                  subtitulo: d.subtitulo || '',
                  descripcion: d.descripcion || '',
                  descuentoPorcentaje: Number(d.descuento_porcentaje || 0),
                  precioOferta: Number(d.precio_oferta || 0),
                  precioRegular: Number(d.precio_regular || 0),
                  etiqueta: d.etiqueta || 'OFERTA',
                  imagen: d.imagen || '',
                  productoId: d.producto_id || '',
                  activa: d.activa !== false,
                  mostrarModalInicio: d.mostrar_modal_inicio !== false,
                  fechaInicio: d.fecha_inicio || '',
                  fechaFin: d.fecha_fin || '',
                  orden: Number(d.orden || 1),
                  createdAt: d.created_at,
                  updatedAt: d.updated_at,
                }));
                saveLocalPromociones(mapped);
                callback(mapped);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription error on promociones:', err);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageOrLocal);
      window.removeEventListener('delicias_promociones_changed', handleStorageOrLocal);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  },

  async getPromociones(): Promise<Promocion[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('promociones')
          .select('*')
          .order('orden', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            titulo: d.titulo || '',
            subtitulo: d.subtitulo || '',
            descripcion: d.descripcion || '',
            descuentoPorcentaje: Number(d.descuento_porcentaje || 0),
            precioOferta: Number(d.precio_oferta || 0),
            precioRegular: Number(d.precio_regular || 0),
            etiqueta: d.etiqueta || 'OFERTA',
            imagen: d.imagen || '',
            productoId: d.producto_id || '',
            activa: d.activa !== false,
            mostrarModalInicio: d.mostrar_modal_inicio !== false,
            fechaInicio: d.fecha_inicio || '',
            fechaFin: d.fecha_fin || '',
            orden: Number(d.orden || 1),
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      } catch (e) {
        console.warn('Error fetching promociones from Supabase:', e);
      }
    }
    return getLocalPromociones();
  },

  async crearPromocion(promo: Omit<Promocion, 'id'>): Promise<Promocion> {
    const id = 'promo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const newPromo: Promocion = {
      ...promo,
      id,
      orden: promo.orden || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save local
    const list = getLocalPromociones();
    const updated = [newPromo, ...list];
    saveLocalPromociones(updated);

    // 2. Save Supabase if configured
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        await client.from('promociones').insert({
          id: newPromo.id,
          titulo: newPromo.titulo,
          subtitulo: newPromo.subtitulo || '',
          descripcion: newPromo.descripcion || '',
          descuento_porcentaje: newPromo.descuentoPorcentaje || 0,
          precio_oferta: newPromo.precioOferta || 0,
          precio_regular: newPromo.precioRegular || 0,
          etiqueta: newPromo.etiqueta || 'OFERTA',
          imagen: newPromo.imagen || '',
          producto_id: newPromo.productoId || '',
          activa: newPromo.activa !== false,
          mostrar_modal_inicio: newPromo.mostrarModalInicio !== false,
          fecha_inicio: newPromo.fechaInicio || '',
          fecha_fin: newPromo.fechaFin || '',
          orden: newPromo.orden || 1,
        });
      } catch (e) {
        console.warn('Error creating promocion in Supabase:', e);
      }
    }

    return newPromo;
  },

  async actualizarPromocion(id: string, updates: Partial<Promocion>): Promise<Promocion> {
    const list = getLocalPromociones();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Promoción no encontrada');

    const updatedPromo: Promocion = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updatedPromo;
    saveLocalPromociones(list);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const payload: any = { updated_at: updatedPromo.updatedAt };
        if (updates.titulo !== undefined) payload.titulo = updates.titulo;
        if (updates.subtitulo !== undefined) payload.subtitulo = updates.subtitulo;
        if (updates.descripcion !== undefined) payload.descripcion = updates.descripcion;
        if (updates.descuentoPorcentaje !== undefined) payload.descuento_porcentaje = updates.descuentoPorcentaje;
        if (updates.precioOferta !== undefined) payload.precio_oferta = updates.precioOferta;
        if (updates.precioRegular !== undefined) payload.precio_regular = updates.precioRegular;
        if (updates.etiqueta !== undefined) payload.etiqueta = updates.etiqueta;
        if (updates.imagen !== undefined) payload.imagen = updates.imagen;
        if (updates.productoId !== undefined) payload.producto_id = updates.productoId;
        if (updates.activa !== undefined) payload.activa = updates.activa;
        if (updates.mostrarModalInicio !== undefined) payload.mostrar_modal_inicio = updates.mostrarModalInicio;
        if (updates.fechaInicio !== undefined) payload.fecha_inicio = updates.fechaInicio;
        if (updates.fechaFin !== undefined) payload.fecha_fin = updates.fechaFin;
        if (updates.orden !== undefined) payload.orden = updates.orden;

        await client.from('promociones').update(payload).eq('id', id);
      } catch (e) {
        console.warn('Error updating promocion in Supabase:', e);
      }
    }

    return updatedPromo;
  },

  async eliminarPromocion(id: string): Promise<void> {
    recordDeletedPromoId(id);
    const list = getLocalPromociones();
    const filtered = list.filter((p) => p.id !== id);
    saveLocalPromociones(filtered);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        await client.from('promociones').delete().eq('id', id);
      } catch (e) {
        console.warn('Error deleting promocion in Supabase:', e);
      }
    }
  },

  async toggleActiva(id: string): Promise<boolean> {
    const list = getLocalPromociones();
    const item = list.find((p) => p.id === id);
    if (!item) return false;
    const newState = !item.activa;
    await this.actualizarPromocion(id, { activa: newState });
    return newState;
  },

  async toggleModalInicio(id: string): Promise<boolean> {
    const list = getLocalPromociones();
    const item = list.find((p) => p.id === id);
    if (!item) return false;
    const newState = !item.mostrarModalInicio;
    await this.actualizarPromocion(id, { mostrarModalInicio: newState });
    return newState;
  },

  async eliminarTodasLasPromociones(): Promise<void> {
    const list = getLocalPromociones();
    for (const p of list) {
      if (p.id) recordDeletedPromoId(p.id);
    }
    saveLocalPromociones([]);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        await client.from('promociones').delete().neq('id', 'dummy_id');
      } catch (err) {
        console.warn('Error clearing Supabase promociones:', err);
      }
    }
  },
};
