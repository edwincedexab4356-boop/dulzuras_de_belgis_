import { UserRole, UsuarioDoc } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'delicias_belgi_usuarios';

export function normalizeRole(raw: any): UserRole {
  if (!raw) return 'cajero';
  const str = String(raw).trim().toLowerCase();
  if (str === 'admin' || str === 'administrador') {
    return 'admin';
  }
  return 'cajero';
}

export function getRoleDisplayName(role: UserRole | string): 'Administrador' | 'Cajero' {
  return normalizeRole(role) === 'admin' ? 'Administrador' : 'Cajero';
}

const DEFAULT_USUARIOS: UsuarioDoc[] = [
  {
    id: 'usr-admin-1',
    uid: 'usr-admin-1',
    email: 'edwinc3d3@gmail.com',
    nombre: 'Edwin Cedeño (Admin)',
    role: 'admin',
    rol: 'admin',
    activo: true,
    fechaCreacion: '2026-01-01T08:00:00.000Z',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-admin-2',
    uid: 'usr-admin-2',
    email: 'pedro76porro@gmail.com',
    nombre: 'Administrador Principal',
    role: 'admin',
    rol: 'admin',
    activo: true,
    fechaCreacion: '2026-01-01T08:00:00.000Z',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-cajero-1',
    uid: 'usr-cajero-1',
    email: 'caja@dulzurasdebelgis.com',
    nombre: 'Cajero General',
    role: 'cajero',
    rol: 'cajero',
    activo: true,
    fechaCreacion: '2026-01-01T08:00:00.000Z',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-cajero-2',
    uid: 'usr-cajero-2',
    email: 'edwincede.xab4356@gmail.com',
    nombre: 'Cajero Principal',
    role: 'cajero',
    rol: 'cajero',
    activo: true,
    fechaCreacion: '2026-01-01T08:00:00.000Z',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
];

function getLocalUsuarios(): UsuarioDoc[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('LocalStorage error reading usuarios:', e);
  }
  return [...DEFAULT_USUARIOS];
}

function saveLocalUsuarios(items: UsuarioDoc[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_usuarios_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving usuarios:', e);
  }
}

export const usuariosService = {
  subscribeToUsuarios(callback: (items: UsuarioDoc[]) => void): () => void {
    const initial = getLocalUsuarios();
    callback(initial);

    const handler = () => callback(getLocalUsuarios());
    window.addEventListener('delicias_usuarios_changed', handler);

    let supabaseChannel: any = null;

    const fetchFromSupabase = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      try {
        const { data, error } = await client.from('usuarios').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          const list: UsuarioDoc[] = data.map((r) => ({
            id: r.id,
            uid: r.uid || r.id,
            email: r.email,
            nombre: r.nombre,
            role: normalizeRole(r.role || r.rol),
            rol: normalizeRole(r.rol || r.role),
            activo: r.activo !== false,
            fechaCreacion: r.fecha_creacion || new Date().toISOString(),
            createdAt: r.fecha_creacion || new Date().toISOString(),
          }));
          saveLocalUsuarios(list);
          callback(list);
        }
      } catch (e) {
        console.warn('Error fetching usuarios from Supabase:', e);
      }
    };

    if (isSupabaseConfigured()) {
      fetchFromSupabase();

      const client = getSupabaseClient();
      if (client) {
        supabaseChannel = client
          .channel('usuarios_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
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
      window.removeEventListener('delicias_usuarios_changed', handler);
      window.removeEventListener('delicias_supabase_config_changed', configListener);
      if (supabaseChannel) {
        const client = getSupabaseClient();
        if (client) client.removeChannel(supabaseChannel);
      }
    };
  },

  async getUsuarios(): Promise<UsuarioDoc[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.from('usuarios').select('*');
        if (!error && data && data.length > 0) {
          return data.map((r) => ({
            id: r.id,
            uid: r.uid || r.id,
            email: r.email,
            nombre: r.nombre,
            role: normalizeRole(r.role || r.rol),
            rol: normalizeRole(r.rol || r.role),
            activo: r.activo !== false,
            fechaCreacion: r.fecha_creacion || new Date().toISOString(),
            createdAt: r.fecha_creacion || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.warn('Error getting usuarios from Supabase:', e);
      }
    }
    return getLocalUsuarios();
  },

  async getUserRole(uid: string, email?: string | null, displayName?: string | null): Promise<UserRole> {
    const cleanEmail = (email || '').trim().toLowerCase();

    const list = await this.getUsuarios();
    const found = list.find(
      (u) => (u.uid && u.uid === uid) || (cleanEmail && u.email.toLowerCase() === cleanEmail)
    );

    if (found) {
      if (found.activo === false) {
        throw new Error('USUARIO_DESACTIVADO');
      }
      return normalizeRole(found.role || found.rol);
    }

    if (cleanEmail === 'edwinc3d3@gmail.com' || cleanEmail === 'pedro76porro@gmail.com') {
      return 'admin';
    }

    const assignedRole: UserRole = 'cajero';

    if (cleanEmail) {
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured()) {
        client
          .from('usuarios')
          .upsert({
            id: uid || 'usr-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
            uid: uid || 'usr-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
            email: cleanEmail,
            nombre: displayName || cleanEmail.split('@')[0],
            role: assignedRole,
            rol: assignedRole,
            activo: true,
          })
          .then(
            () => {},
            (e: any) => console.warn('Auto-create usuario error:', e)
          );
      }
    }

    return assignedRole;
  },

  async setUsuarioRole(id: string, role: UserRole): Promise<void> {
    const list = getLocalUsuarios();
    const idx = list.findIndex((u) => u.id === id || u.uid === id);
    if (idx !== -1) {
      list[idx].role = role;
      list[idx].rol = role;
      saveLocalUsuarios(list);
    }

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('usuarios')
        .update({ role, rol: role })
        .or(`id.eq.${id},uid.eq.${id}`)
        .then(() => {}, () => {});
    }
  },

  async setUsuarioActivo(id: string, activo: boolean): Promise<void> {
    const list = getLocalUsuarios();
    const idx = list.findIndex((u) => u.id === id || u.uid === id);
    if (idx !== -1) {
      list[idx].activo = activo;
      saveLocalUsuarios(list);
    }

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('usuarios')
        .update({ activo })
        .or(`id.eq.${id},uid.eq.${id}`)
        .then(() => {}, () => {});
    }
  },

  async actualizarUsuario(id: string, updates: Partial<UsuarioDoc>): Promise<void> {
    const list = getLocalUsuarios();
    const idx = list.findIndex((u) => u.id === id || u.uid === id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        ...updates,
        role: updates.rol ? normalizeRole(updates.rol) : updates.role ? normalizeRole(updates.role) : list[idx].role,
        rol: updates.rol ? normalizeRole(updates.rol) : updates.role ? normalizeRole(updates.role) : list[idx].rol,
      };
      saveLocalUsuarios(list);
    }

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const dbPayload: Record<string, any> = {};
      if (updates.nombre !== undefined) dbPayload.nombre = updates.nombre;
      if (updates.email !== undefined) dbPayload.email = updates.email;
      if (updates.rol !== undefined) {
        dbPayload.rol = normalizeRole(updates.rol);
        dbPayload.role = normalizeRole(updates.rol);
      }
      if (updates.role !== undefined) {
        dbPayload.role = normalizeRole(updates.role);
        dbPayload.rol = normalizeRole(updates.role);
      }
      if (updates.activo !== undefined) dbPayload.activo = updates.activo;

      client
        .from('usuarios')
        .update(dbPayload)
        .or(`id.eq.${id},uid.eq.${id}`)
        .then(() => {}, () => {});
    }
  },

  async crearUsuario(user: Partial<UsuarioDoc> & { nombre: string; email: string; rol?: UserRole }): Promise<UsuarioDoc> {
    const id = user.uid || 'usr-' + Date.now();
    const finalRole = normalizeRole(user.rol || user.role);
    const newUser: UsuarioDoc = {
      id,
      uid: user.uid || id,
      email: user.email,
      nombre: user.nombre,
      role: finalRole,
      rol: finalRole,
      activo: user.activo !== false,
      fechaCreacion: user.fechaCreacion || new Date().toISOString(),
      createdAt: user.createdAt || new Date().toISOString(),
    };

    const list = getLocalUsuarios();
    list.push(newUser);
    saveLocalUsuarios(list);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('usuarios')
        .insert({
          id,
          uid: newUser.uid,
          email: newUser.email,
          nombre: newUser.nombre,
          role: newUser.role,
          rol: newUser.rol,
          activo: newUser.activo,
          fecha_creacion: newUser.fechaCreacion,
        })
        .then(() => {}, () => {});
    }

    return newUser;
  },

  async deleteUsuario(id: string): Promise<void> {
    const list = getLocalUsuarios().filter((u) => u.id !== id && u.uid !== id);
    saveLocalUsuarios(list);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      client
        .from('usuarios')
        .delete()
        .or(`id.eq.${id},uid.eq.${id}`)
        .then(() => {}, () => {});
    }
  },

  async eliminarUsuario(id: string): Promise<void> {
    return this.deleteUsuario(id);
  },
};
