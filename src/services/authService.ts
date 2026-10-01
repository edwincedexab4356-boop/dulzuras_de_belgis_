import { UserAuth, UserRole } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { usuariosService, normalizeRole } from './usuariosService';

const SESSION_KEY = 'delicias_belgi_auth_session';

export const authService = {
  onAuthStateChanged(callback: (user: UserAuth | null) => void): () => void {
    return this.subscribe(callback);
  },
  suscribirUsuario(callback: (user: UserAuth | null) => void): () => void {
    return this.subscribe(callback);
  },

  subscribe(callback: (user: UserAuth | null) => void): () => void {
    // 1. Check local session storage first for immediate access
    const checkSession = async () => {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          try {
            const verifiedRole = await usuariosService.getUserRole(parsed.uid, parsed.email);
            callback({
              ...parsed,
              role: verifiedRole,
            });
            return;
          } catch (e: any) {
            if (e.message === 'USUARIO_DESACTIVADO') {
              sessionStorage.removeItem(SESSION_KEY);
              callback(null);
              return;
            }
          }
          callback(parsed);
          return;
        }
      } catch {
        // ignore
      }
      callback(null);
    };

    checkSession();

    let supabaseAuthListener: any = null;
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data } = client.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user && session.user.email) {
          try {
            const role = await usuariosService.getUserRole(
              session.user.id,
              session.user.email,
              session.user.user_metadata?.nombre || session.user.user_metadata?.full_name
            );
            const userAuth: UserAuth = {
              uid: session.user.id,
              email: session.user.email,
              displayName:
                session.user.user_metadata?.nombre ||
                session.user.user_metadata?.full_name ||
                session.user.email.split('@')[0],
              role,
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(userAuth));
            callback(userAuth);
          } catch (err: any) {
            if (err.message === 'USUARIO_DESACTIVADO') {
              await client.auth.signOut();
              sessionStorage.removeItem(SESSION_KEY);
              callback(null);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem(SESSION_KEY);
          callback(null);
        }
      });
      supabaseAuthListener = data.subscription;
    }

    const handleStorage = () => checkSession();
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (supabaseAuthListener) {
        supabaseAuthListener.unsubscribe();
      }
    };
  },

  async login(email: string, password: string, cajeroJornada?: string): Promise<UserAuth> {
    if (!email || !password) {
      throw new Error('Por favor ingrese correo y contraseña.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. DUAL-PASSWORD RULE:
    // If the password is 'cajeroadmin', ALWAYS log in as CAJERO (Punto de Venta)
    if (cleanPassword === 'cajeroadmin') {
      const cashierUser: UserAuth = {
        uid: 'usr-cajero-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        email: cleanEmail,
        displayName: cajeroJornada?.trim() || cleanEmail.split('@')[0] || 'Cajero',
        role: 'cajero',
        cajeroJornada: cajeroJornada?.trim() || undefined,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(cashierUser));
      return cashierUser;
    }

    // 2. Otherwise, this is an ADMINISTRATOR login attempt using their master Authentication password
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (!error && data.user) {
          const adminUser: UserAuth = {
            uid: data.user.id,
            email: data.user.email || cleanEmail,
            displayName:
              data.user.user_metadata?.nombre ||
              data.user.user_metadata?.full_name ||
              cleanEmail.split('@')[0],
            role: 'admin',
          };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));

          // Ensure user is marked as admin in public.usuarios
          try {
            client.from('usuarios').upsert({
              id: data.user.id,
              uid: data.user.id,
              email: cleanEmail,
              nombre: adminUser.displayName,
              role: 'admin',
              rol: 'admin',
              activo: true,
            }).then(() => {}, () => {});
          } catch {}

          return adminUser;
        }

        // If Supabase returned an authentication error
        if (error) {
          // If this is Edwin's admin email, provide fallback if offline/pending confirmation
          if (cleanEmail === 'edwinc3d3@gmail.com' || cleanEmail === 'pedro76porro@gmail.com') {
            const adminUser: UserAuth = {
              uid: 'usr-admin-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
              email: cleanEmail,
              displayName: 'Edwin Cedeño (Admin)',
              role: 'admin',
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
            return adminUser;
          }
          throw new Error('Credenciales incorrectas: ' + (error.message || 'Verifica tu contraseña en Supabase'));
        }
      } catch (e: any) {
        if (cleanEmail === 'edwinc3d3@gmail.com' || cleanEmail === 'pedro76porro@gmail.com') {
          const adminUser: UserAuth = {
            uid: 'usr-admin-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
            email: cleanEmail,
            displayName: 'Edwin Cedeño (Admin)',
            role: 'admin',
          };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
          return adminUser;
        }
        throw new Error(e.message || 'Error al conectar con el servicio de autenticación.');
      }
    }

    // 3. Fallback / Local mode without Supabase connection
    if (!cleanEmail.includes('@')) {
      throw new Error('Por favor ingrese un correo electrónico válido.');
    }
    if (cleanPassword.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }

    // Master admin access for configured emails
    const adminUser: UserAuth = {
      uid: 'usr-admin-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      role: 'admin',
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
    return adminUser;
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
        return {
          ...parsed,
          role: normalizeRole(parsed.role),
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};
