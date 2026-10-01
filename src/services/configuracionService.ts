import { ConfiguracionNegocio } from '../types';
import { INITIAL_CONFIGURACION } from './initialData';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'delicias_belgi_configuracion';

const FORMAL_HERO_SUBTITULO =
  'En Delicias Belgi nos dedicamos a la alta repostería artesanal y dulcería fina, confeccionando creaciones selectas con ingredientes de primera calidad en Ciudad de Colón.';

const LEGACY_DEFAULT_CAJEROS = ['Belgis Gómez', 'Edwin Cedeño', 'María Delgado', 'Carlos Pimentel'];

function isLegacyText(str?: string): boolean {
  if (!str) return false;
  const lower = str.toLowerCase();
  return (
    lower.includes('bolis') ||
    lower.includes('helado') ||
    lower.includes('cremoso') ||
    lower.includes('preparada con amor')
  );
}

function sanitizeConfig(config: ConfiguracionNegocio): { config: ConfiguracionNegocio; wasCleaned: boolean } {
  let wasCleaned = false;
  const cleaned: ConfiguracionNegocio = { ...config };

  if (Array.isArray(cleaned.cajerosPredefinidos)) {
    const isExactLegacy =
      cleaned.cajerosPredefinidos.length === 4 &&
      cleaned.cajerosPredefinidos.every((c) => LEGACY_DEFAULT_CAJEROS.includes(c));
    if (isExactLegacy) {
      cleaned.cajerosPredefinidos = [];
      wasCleaned = true;
    } else {
      const filtered = cleaned.cajerosPredefinidos.filter((c) => !LEGACY_DEFAULT_CAJEROS.includes(c));
      if (filtered.length !== cleaned.cajerosPredefinidos.length) {
        cleaned.cajerosPredefinidos = filtered;
        wasCleaned = true;
      }
    }
  } else {
    cleaned.cajerosPredefinidos = [];
    wasCleaned = true;
  }

  if (!cleaned.heroSubtitulo || isLegacyText(cleaned.heroSubtitulo)) {
    cleaned.heroSubtitulo = FORMAL_HERO_SUBTITULO;
    wasCleaned = true;
  }

  if (
    !cleaned.heroImagen ||
    cleaned.heroImagen.includes('1570197788417') ||
    cleaned.heroImagen.toLowerCase().includes('helado')
  ) {
    cleaned.heroImagen =
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=85';
    wasCleaned = true;
  }

  return { config: cleaned, wasCleaned };
}

function getLocalConfiguracion(): ConfiguracionNegocio {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const { config, wasCleaned } = sanitizeConfig({
        ...INITIAL_CONFIGURACION,
        ...parsed,
      });
      if (wasCleaned) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
      }
      return config;
    }
  } catch (e) {
    console.warn('Error reading config from localStorage:', e);
  }
  return { ...INITIAL_CONFIGURACION };
}

function saveLocalConfiguracion(config: ConfiguracionNegocio) {
  try {
    const { config: sanitized } = sanitizeConfig(config);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new Event('delicias_config_changed'));
  } catch (e) {
    console.warn('Error saving config to localStorage:', e);
  }
}

export const configuracionService = {
  subscribeToConfiguracion(callback: (config: ConfiguracionNegocio) => void): () => void {
    const initial = getLocalConfiguracion();
    callback(initial);

    const handler = () => callback(getLocalConfiguracion());
    window.addEventListener('delicias_config_changed', handler);

    let supabaseChannel: any = null;

    const fetchFromSupabase = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data, error } = await client.from('configuracion').select('data').eq('id', 'negocio').single();
        if (!error && data && data.data) {
          const remoteConfig = { ...INITIAL_CONFIGURACION, ...data.data };
          saveLocalConfiguracion(remoteConfig);
          callback(remoteConfig);
        }
      } catch (e) {
        console.warn('Error fetching config from Supabase:', e);
      }
    };

    if (isSupabaseConfigured()) {
      fetchFromSupabase();

      const client = getSupabaseClient();
      if (client) {
        supabaseChannel = client
          .channel('config_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion' }, () => {
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
      window.removeEventListener('delicias_config_changed', handler);
      window.removeEventListener('delicias_supabase_config_changed', configListener);
      if (supabaseChannel) {
        const client = getSupabaseClient();
        if (client) client.removeChannel(supabaseChannel);
      }
    };
  },

  async getConfiguracion(): Promise<ConfiguracionNegocio> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.from('configuracion').select('data').eq('id', 'negocio').single();
        if (!error && data && data.data) {
          const cfg = { ...INITIAL_CONFIGURACION, ...data.data };
          saveLocalConfiguracion(cfg);
          return cfg;
        }
      } catch (e) {
        console.warn('Error getting config from Supabase:', e);
      }
    }
    return getLocalConfiguracion();
  },

  async guardarConfiguracion(config: ConfiguracionNegocio): Promise<void> {
    const { config: sanitized } = sanitizeConfig(config);
    const updated = {
      ...sanitized,
      actualizadoEn: new Date().toISOString(),
    };

    saveLocalConfiguracion(updated);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        await client.from('configuracion').upsert({
          id: 'negocio',
          data: updated,
          updated_at: updated.actualizadoEn,
        });
      } catch (e) {
        console.warn('Error saving config in Supabase:', e);
      }
    }
  },

  async updateConfiguracion(updates: Partial<ConfiguracionNegocio>): Promise<void> {
    const current = this.getLocalConfiguracion();
    await this.guardarConfiguracion({ ...current, ...updates });
  },

  getLocalConfiguracion(): ConfiguracionNegocio {
    return getLocalConfiguracion();
  },
};
