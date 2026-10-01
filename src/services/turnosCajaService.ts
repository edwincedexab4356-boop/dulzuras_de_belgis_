import { deduplicateById } from '../utils/deduplicate';
import { getPanamaTodayYMD, getPanamaTimeHM } from '../utils/formatters';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export interface TurnoCaja {
  id?: string;
  cajero: string;
  cajeroEmail?: string;
  cajeroUid?: string;
  fechaApertura: string;
  horaApertura: string;
  montoInicial: number;
  estado: 'abierto' | 'cerrado';
  fechaCierre?: string;
  horaCierre?: string;
  montoFinal?: number;
  totalVentas?: number;
  diferencia?: number;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'delicias_belgi_turnos_caja';

function getLocalTurnos(): TurnoCaja[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return deduplicateById(parsed);
      }
    }
  } catch (e) {
    console.warn('Error leyendo turnos locales:', e);
  }
  return [];
}

function saveLocalTurnos(items: TurnoCaja[]) {
  try {
    const unique = deduplicateById(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new Event('delicias_turnos_changed'));
  } catch (e) {
    console.warn('Error guardando turnos locales:', e);
  }
}

function normalizeTurno(id: string, data: any): TurnoCaja {
  return {
    id,
    cajero: data.cajero || 'Cajero',
    cajeroEmail: data.cajeroEmail || data.cajero_email || '',
    cajeroUid: data.cajeroUid || data.cajero_uid || '',
    fechaApertura: data.fechaApertura || data.fecha_apertura || getPanamaTodayYMD(),
    horaApertura: data.horaApertura || data.hora_apertura || getPanamaTimeHM(),
    montoInicial: Number(data.montoInicial ?? data.monto_inicial ?? 0),
    estado: data.estado || 'abierto',
    fechaCierre: data.fechaCierre || data.fecha_cierre || undefined,
    horaCierre: data.horaCierre || data.hora_cierre || undefined,
    montoFinal: data.montoFinal !== undefined ? Number(data.montoFinal) : data.monto_final !== undefined ? Number(data.monto_final) : undefined,
    totalVentas: data.totalVentas !== undefined ? Number(data.totalVentas) : data.total_ventas !== undefined ? Number(data.total_ventas) : undefined,
    diferencia: data.diferencia !== undefined ? Number(data.diferencia) : undefined,
    observaciones: data.observaciones || '',
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
    updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
  };
}

export const turnosCajaService = {
  subscribeToTurnos(callback: (items: TurnoCaja[]) => void): () => void {
    const initial = getLocalTurnos();
    callback(initial);

    const handler = () => callback(getLocalTurnos());
    window.addEventListener('delicias_turnos_changed', handler);

    let supabaseChannel: any = null;

    const fetchFromSupabase = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data, error } = await client.from('turnos_caja').select('*').order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          const items = data.map((r) => normalizeTurno(r.id, r));
          saveLocalTurnos(items);
          callback(items);
        }
      } catch (e) {
        console.warn('Error fetching turnos from Supabase:', e);
      }
    };

    if (isSupabaseConfigured()) {
      fetchFromSupabase();

      const client = getSupabaseClient();
      if (client) {
        supabaseChannel = client
          .channel('turnos_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos_caja' }, () => {
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
      window.removeEventListener('delicias_turnos_changed', handler);
      window.removeEventListener('delicias_supabase_config_changed', configListener);
      if (supabaseChannel) {
        const client = getSupabaseClient();
        if (client) client.removeChannel(supabaseChannel);
      }
    };
  },

  async getTurnos(): Promise<TurnoCaja[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.from('turnos_caja').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return deduplicateById(data.map((r) => normalizeTurno(r.id, r)));
        }
      } catch (e) {
        console.warn('Error getting turnos from Supabase:', e);
      }
    }
    return getLocalTurnos();
  },

  async getTurnoAbiertoActual(cajero?: string): Promise<TurnoCaja | null> {
    const turnos = await this.getTurnos();
    const abierto = turnos.find((t) => {
      if (t.estado !== 'abierto') return false;
      if (cajero && t.cajero && t.cajero.toLowerCase().trim() !== cajero.toLowerCase().trim()) {
        return false;
      }
      return true;
    });
    return abierto || null;
  },

  async abrirTurno(params: {
    cajero: string;
    cajeroEmail?: string;
    cajeroUid?: string;
    montoInicial: number;
    observaciones?: string;
  }): Promise<TurnoCaja> {
    const now = new Date().toISOString();
    const id = 'turno-' + Date.now();
    const nuevo: TurnoCaja = {
      id,
      cajero: params.cajero.trim(),
      cajeroEmail: params.cajeroEmail,
      cajeroUid: params.cajeroUid,
      fechaApertura: getPanamaTodayYMD(),
      horaApertura: getPanamaTimeHM(),
      montoInicial: Number(params.montoInicial) || 0,
      estado: 'abierto',
      observaciones: params.observaciones?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    const current = getLocalTurnos();
    current.unshift(nuevo);
    saveLocalTurnos(current);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('turnos_caja')
        .insert({
          id,
          cajero: nuevo.cajero,
          cajero_email: nuevo.cajeroEmail,
          cajero_uid: nuevo.cajeroUid,
          fecha_apertura: nuevo.fechaApertura,
          hora_apertura: nuevo.horaApertura,
          monto_inicial: nuevo.montoInicial,
          estado: nuevo.estado,
          observaciones: nuevo.observaciones,
          created_at: nuevo.createdAt,
          updated_at: nuevo.updatedAt,
        })
        .then(
          () => {},
          (e: any) => console.warn('Supabase turnos_caja insert error:', e)
        );
    }

    return nuevo;
  },

  async cerrarTurno(
    turnoId: string,
    params: {
      montoFinal: number;
      totalVentas: number;
      diferencia?: number;
      observaciones?: string;
    }
  ): Promise<TurnoCaja> {
    const now = new Date().toISOString();
    const current = getLocalTurnos();
    const idx = current.findIndex((t) => t.id === turnoId);
    const diff =
      params.diferencia !== undefined
        ? Number(params.diferencia)
        : (Number(params.montoFinal) || 0) - (Number(params.totalVentas) || 0);

    const updates = {
      estado: 'cerrado' as const,
      fechaCierre: getPanamaTodayYMD(),
      horaCierre: getPanamaTimeHM(),
      montoFinal: Number(params.montoFinal) || 0,
      totalVentas: Number(params.totalVentas) || 0,
      diferencia: diff,
      observaciones: params.observaciones?.trim() || '',
      updatedAt: now,
    };

    let updatedTurno: TurnoCaja;
    if (idx !== -1) {
      updatedTurno = { ...current[idx], ...updates };
      current[idx] = updatedTurno;
      saveLocalTurnos(current);
    } else {
      updatedTurno = {
        id: turnoId,
        cajero: 'Cajero',
        fechaApertura: getPanamaTodayYMD(),
        horaApertura: getPanamaTimeHM(),
        montoInicial: 0,
        createdAt: now,
        ...updates,
      };
      current.unshift(updatedTurno);
      saveLocalTurnos(current);
    }

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('turnos_caja')
        .update({
          estado: 'cerrado',
          fecha_cierre: updates.fechaCierre,
          hora_cierre: updates.horaCierre,
          monto_final: updates.montoFinal,
          total_ventas: updates.totalVentas,
          diferencia: updates.diferencia,
          observaciones: updates.observaciones,
          updated_at: now,
        })
        .eq('id', turnoId)
        .then(
          () => {},
          (e: any) => console.warn('Supabase turnos_caja update error:', e)
        );
    }

    return updatedTurno;
  },

  getLocalTurnos(): TurnoCaja[] {
    return getLocalTurnos();
  },
};
