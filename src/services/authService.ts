import type { User } from '@supabase/supabase-js';
import { UserAuth } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { usuariosService, normalizeRole } from './usuariosService';

const SESSION_KEY = 'delicias_belgi_auth_session';

/** Nombre del cajero de la jornada (se elige al entrar; no es parte de la cuenta). */
function getJornada(): string | undefined {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved).cajeroJornada || undefined : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Convierte la cuenta de Supabase en el usuario del panel. El rol sale SIEMPRE de la tabla
 * "usuarios" (no del correo ni de la contraseña). Sin registro activo no hay acceso.
 */
async function toPanelUser(user: User, cajeroJornada?: string): Promise<UserAuth> {
  const email = (user.email || '').toLowerCase();
  const role = await usuariosService.getUserRole(user.id, email);
  const jornada = role === 'cajero' ? cajeroJornada || getJornada() : undefined;
  const panelUser: UserAuth = {
    uid: user.id,
    email,
    displayName: jornada || user.user_metadata?.nombre || user.user_metadata?.full_name || email.split('@')[0],
    role,
    cajeroJornada: jornada,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(panelUser));
  return panelUser;
}

function friendlyError(err: any): Error {
  const msg = String(err?.message || '');
  if (msg === 'USUARIO_DESACTIVADO') return new Error('Tu usuario está desactivado. Pide al administrador que lo active.');
  if (msg === 'SIN_ACCESO') return new Error('Esta cuenta no tiene acceso al panel. Pide al administrador que te agregue en Usuarios.');
  if (/invalid login credentials/i.test(msg)) return new Error('Correo o contraseña incorrectos.');
  if (/email not confirmed/i.test(msg)) return new Error('Este correo todavía no fue confirmado. Revisa tu bandeja de entrada.');
  if (/rate limit|too many/i.test(msg)) return new Error('Demasiados intentos. Espera un momento y vuelve a intentar.');
  if (/fetch|network/i.test(msg)) return new Error('Error de conexión. Revisa tu internet e intenta de nuevo.');
  return new Error(msg || 'Error al iniciar sesión.');
}

export const authService = {
  onAuthStateChanged(callback: (user: UserAuth | null) => void): () => void {
    return this.subscribe(callback);
  },

  suscribirUsuario(callback: (user: UserAuth | null) => void): () => void {
    return this.subscribe(callback);
  },

  subscribe(callback: (user: UserAuth | null) => void): () => void {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      callback(null);
      return () => {};
    }
    let lastUserId: string | null | undefined;
    const { data } = client.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      // Renovar el token no cambia el usuario: no hace falta volver a consultar su rol.
      if (event === 'TOKEN_REFRESHED' && userId === lastUserId) return;
      lastUserId = userId;
      // Fuera del callback: Supabase no permite consultar la base dentro de él.
      setTimeout(async () => {
        if (!session?.user) {
          sessionStorage.removeItem(SESSION_KEY);
          callback(null);
          return;
        }
        try {
          callback(await toPanelUser(session.user));
        } catch (err) {
          console.warn('Sin acceso al panel:', friendlyError(err).message);
          await client.auth.signOut().catch(() => {});
          sessionStorage.removeItem(SESSION_KEY);
          callback(null);
        }
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  },

  async login(email: string, password: string, cajeroJornada?: string): Promise<UserAuth> {
    if (!email || !password) {
      throw new Error('Por favor ingrese correo y contraseña.');
    }
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      throw new Error('La página no está conectada a la base de datos.');
    }
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) throw friendlyError(error);
    try {
      return await toPanelUser(data.user, cajeroJornada?.trim() || undefined);
    } catch (err) {
      await client.auth.signOut().catch(() => {});
      sessionStorage.removeItem(SESSION_KEY);
      throw friendlyError(err);
    }
  },

  updateCajeroJornada(nombre: string): void {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.cajeroJornada = nombre.trim();
        parsed.displayName = nombre.trim();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Error updating cajero jornada in session:', e);
    }
  },

  async logout(): Promise<void> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn('Error signing out of Supabase:', e);
      }
    }
    sessionStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser(): UserAuth | null {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...parsed, role: normalizeRole(parsed.role) };
      }
      return null;
    } catch {
      return null;
    }
  },
};
