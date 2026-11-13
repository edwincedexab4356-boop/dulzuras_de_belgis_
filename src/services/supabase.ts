import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'delicias_belgi_supabase_config';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const DEFAULT_SUPABASE_URL = 'https://pomwijmwjxksyvlfrgdn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbXdpam13anhrc3l2bGZyZ2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDQ1MzAsImV4cCI6MjEwNjI4MDUzMH0.tbAvgxaYHHa9GE8VxY7tpO61k6z0aqI661NkXuNubC8';

export function getSupabaseConfig(): SupabaseConfig {
  let url = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  let anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();

  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.anonKey) {
          url = parsed.url.trim();
          anonKey = parsed.anonKey.trim();
        }
      }
    } catch (e) {
      console.warn('Error reading Supabase config from localStorage:', e);
    }
  }

  return { url, anonKey };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
      );
      window.dispatchEvent(new Event('delicias_supabase_config_changed'));
    } catch (e) {
      console.warn('Error saving Supabase config to localStorage:', e);
    }
  }
}

export function clearSupabaseConfig(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event('delicias_supabase_config_changed'));
    } catch (e) {
      console.warn('Error clearing Supabase config:', e);
    }
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(
    url &&
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    anonKey &&
    anonKey.length > 20
  );
}

let clientInstance: SupabaseClient | null = null;
let lastUrl = '';
let lastAnonKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();

  if (!isSupabaseConfigured()) {
    clientInstance = null;
    return null;
  }

  if (clientInstance && lastUrl === url && lastAnonKey === anonKey) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUrl = url;
    lastAnonKey = anonKey;
    return clientInstance;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

export const supabase = getSupabaseClient();

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Faltan credenciales válidas de Supabase (URL y Clave Anon).',
    };
  }

  try {
    const { error } = await client.from('configuracion').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Conexión a Supabase exitosa, pero las tablas aún no han sido creadas. Ejecuta el script SQL en el editor de Supabase.',
        };
      }
      return {
        success: false,
        message: `Error al consultar Supabase: ${error.message} (Código: ${error.code || 'desconocido'})`,
      };
    }
    return {
      success: true,
      message: '¡Conexión y tablas de Supabase verificadas con éxito!',
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Error de red o conexión: ${e?.message || String(e)}`,
    };
  }
}

export async function uploadImageToSupabaseStorage(
  file: File | Blob,
  folder: string = 'productos'
): Promise<{ url: string | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    return { url: null, error: 'Supabase no está configurado.' };
  }

  try {
    const ext = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { error: uploadError } = await client.storage
      .from('imagenes')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = client.storage.from('imagenes').getPublicUrl(fileName);
    return { url: data.publicUrl, error: null };
  } catch (e: any) {
    return { url: null, error: e?.message || 'Error al subir imagen a Supabase Storage' };
  }
}

export const SUPABASE_SCHEMA_SQL = `-- ====================================================================
-- SCRIPT DE INICIALIZACIÓN COMPLETO PARA SUPABASE (IDEMPOTENTE Y SEGURO)
-- Delicias Belgi / Dulzuras de Belgi's
-- Ejecuta todo este bloque en Supabase > SQL Editor > RUN
-- ====================================================================

-- 1. TABLA DE CONFIGURACIÓN DEL NEGOCIO
CREATE TABLE IF NOT EXISTS public.configuracion (
  id TEXT PRIMARY KEY DEFAULT 'negocio',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categorias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  imagen TEXT DEFAULT '',
  activa BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.productos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  precio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  costo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  categoria TEXT NOT NULL DEFAULT 'Dulcería',
  imagen TEXT DEFAULT '',
  disponible BOOLEAN NOT NULL DEFAULT true,
  activo BOOLEAN NOT NULL DEFAULT true,
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 0,
  total_producido INT DEFAULT 0,
  total_vendido INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA DE VENTAS
CREATE TABLE IF NOT EXISTS public.ventas (
  id TEXT PRIMARY KEY,
  numero_factura TEXT DEFAULT '',
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  descuento NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  itbms NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  monto_recibido NUMERIC(10,2) DEFAULT 0.00,
  cambio NUMERIC(10,2) DEFAULT 0.00,
  usuario TEXT DEFAULT 'Cajero',
  cajero_jornada TEXT DEFAULT '',
  tipo_venta TEXT DEFAULT 'local',
  anulada BOOLEAN DEFAULT false,
  motivo_anulacion TEXT DEFAULT '',
  fecha_anulacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA DE MOVIMIENTOS DE INVENTARIO
CREATE TABLE IF NOT EXISTS public.inventario_movimientos (
  id TEXT PRIMARY KEY,
  producto_id TEXT NOT NULL,
  producto TEXT NOT NULL,
  producto_nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'entrada',
  cantidad INT NOT NULL DEFAULT 0,
  cantidad_anterior INT NOT NULL DEFAULT 0,
  cantidad_nueva INT NOT NULL DEFAULT 0,
  diferencia INT NOT NULL DEFAULT 0,
  motivo TEXT DEFAULT '',
  usuario TEXT DEFAULT 'Administrador',
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA DE PRODUCCIÓN Y LOTES
CREATE TABLE IF NOT EXISTS public.producciones (
  id TEXT PRIMARY KEY,
  producto_id TEXT NOT NULL,
  producto TEXT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  costo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  costo_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL DEFAULT '12:00',
  responsable TEXT DEFAULT 'Administrador',
  notas TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABLA DE USUARIOS Y ROLES (ADMIN & CAJERO)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cajero',
  rol TEXT NOT NULL DEFAULT 'cajero',
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TABLA DE TURNOS DE CAJA
CREATE TABLE IF NOT EXISTS public.turnos_caja (
  id TEXT PRIMARY KEY,
  cajero TEXT NOT NULL,
  cajero_email TEXT DEFAULT '',
  cajero_uid TEXT DEFAULT '',
  fecha_apertura TEXT NOT NULL,
  hora_apertura TEXT NOT NULL,
  monto_inicial NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  estado TEXT NOT NULL DEFAULT 'abierto',
  fecha_cierre TEXT DEFAULT '',
  hora_cierre TEXT DEFAULT '',
  monto_final NUMERIC(10,2) DEFAULT 0.00,
  total_ventas NUMERIC(10,2) DEFAULT 0.00,
  diferencia NUMERIC(10,2) DEFAULT 0.00,
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TABLA DE PROMOCIONES Y OFERTAS ESPECIALES
CREATE TABLE IF NOT EXISTS public.promociones (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  subtitulo TEXT DEFAULT '',
  descripcion TEXT DEFAULT '',
  descuento_porcentaje NUMERIC(5,2) DEFAULT 0,
  precio_oferta NUMERIC(10,2) DEFAULT 0.00,
  precio_regular NUMERIC(10,2) DEFAULT 0.00,
  etiqueta TEXT DEFAULT 'OFERTA ESPECIAL',
  imagen TEXT DEFAULT '',
  producto_id TEXT DEFAULT '',
  activa BOOLEAN NOT NULL DEFAULT true,
  mostrar_modal_inicio BOOLEAN NOT NULL DEFAULT true,
  fecha_inicio TEXT DEFAULT '',
  fecha_fin TEXT DEFAULT '',
  orden INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 10. CONFIGURACIÓN DEL STORAGE PARA IMÁGENES
-- ====================================================================
-- Crear o asegurar el bucket público 'imagenes'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagenes',
  'imagenes',
  true,
  10485760, -- 10 MB límite por foto
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ====================================================================
-- SEGURIDAD (reglas de acceso)
-- El público solo LEE productos, categorías, configuración y promociones.
-- Ventas, inventario, producción y caja: solo personal con cuenta activa en "usuarios".
-- Categorías, configuración, promociones y usuarios: solo administradores.
-- Las cuentas se crean en Supabase > Authentication > Add user y se agregan en la tabla usuarios.
-- ====================================================================
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.producciones ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.usuarios (id, uid, email, nombre, role, rol, activo)
VALUES
  ('usr-admin-1', 'usr-admin-1', 'edwinc3d3@gmail.com', 'Edwin Cedeño (Admin)', 'admin', 'admin', true),
  ('usr-cajero-1', 'usr-cajero-1', 'caja@dulzurasdebelgis.com', 'Cajero de Turno', 'cajero', 'cajero', true)
ON CONFLICT (id) DO NOTHING;

-- 5) Quién es personal del negocio
create or replace function public.es_personal() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios where id = auth.uid()::text and activo is not false);
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios where id = auth.uid()::text and activo is not false and coalesce(role, rol) = 'admin');
$$;

-- Vincula al usuario que el administrador creó con su correo, solo si el correo está confirmado.
create or replace function public.vincular_mi_usuario() returns json
language plpgsql security definer set search_path = public as $$
declare
  me text := auth.uid()::text;
  mail text;
  pre public.usuarios%rowtype;
begin
  if me is null then return null; end if;
  select * into pre from public.usuarios where id = me;
  if found then return json_build_object('role', coalesce(pre.role, pre.rol), 'activo', pre.activo is not false); end if;
  select lower(email) into mail from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if mail is null then return null; end if;
  select * into pre from public.usuarios where lower(email) = mail order by fecha_creacion limit 1;
  if not found then return null; end if;
  delete from public.usuarios where id = pre.id;
  insert into public.usuarios (id, uid, email, nombre, role, rol, activo, fecha_creacion, extra)
  values (me, me, mail, pre.nombre, coalesce(pre.role, pre.rol, 'caja'), coalesce(pre.role, pre.rol, 'caja'), pre.activo, pre.fecha_creacion, coalesce(pre.extra, '{}'::jsonb));
  return json_build_object('role', coalesce(pre.role, pre.rol, 'caja'), 'activo', pre.activo is not false);
end $$;

revoke all on function public.vincular_mi_usuario() from public, anon;
grant execute on function public.vincular_mi_usuario() to authenticated;

-- El registro automático daba acceso a cualquiera que se creara una cuenta (y dejaba elegir el rol).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 6) Reglas de acceso (antes: cualquiera podía leer y borrar todo)
do $$
declare r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- Lo que ve el público en la tienda
create policy lectura_publica on public.productos for select using (true);
create policy lectura_publica on public.categorias for select using (true);
create policy lectura_publica on public.configuracion for select using (true);
create policy lectura_publica on public.promociones for select using (true);

-- Productos: la caja descuenta stock al vender; crear y borrar solo el administrador
create policy personal_edita on public.productos for update using (public.es_personal()) with check (public.es_personal());
create policy personal_crea on public.productos for insert with check (public.es_personal());
create policy admin_borra on public.productos for delete using (public.es_admin());

create policy admin_escribe on public.categorias for all using (public.es_admin()) with check (public.es_admin());
create policy admin_escribe on public.configuracion for all using (public.es_admin()) with check (public.es_admin());
create policy admin_escribe on public.promociones for all using (public.es_admin()) with check (public.es_admin());

-- Operación diaria: solo personal activo
create policy personal_lee on public.ventas for select using (public.es_personal());
create policy personal_crea on public.ventas for insert with check (public.es_personal());
create policy personal_edita on public.ventas for update using (public.es_personal()) with check (public.es_personal());
create policy admin_borra on public.ventas for delete using (public.es_admin());

create policy personal_todo on public.inventario_movimientos for all using (public.es_personal()) with check (public.es_personal());
create policy personal_todo on public.producciones for all using (public.es_personal()) with check (public.es_personal());
create policy personal_todo on public.turnos_caja for all using (public.es_personal()) with check (public.es_personal());
create policy personal_todo on public.pedidos for all using (public.es_personal()) with check (public.es_personal());
create policy personal_todo on public.clientes for all using (public.es_personal()) with check (public.es_personal());

-- Usuarios: cada quien ve su propio registro; el administrador los maneja todos
create policy ver_mi_usuario on public.usuarios for select using (id = auth.uid()::text or public.es_admin());
create policy admin_escribe on public.usuarios for all using (public.es_admin()) with check (public.es_admin());

-- 7) Fotos: todos las ven; solo el personal sube, cambia o borra
drop policy if exists "Subida de imagenes admin" on storage.objects;
drop policy if exists "Actualizacion de imagenes" on storage.objects;
drop policy if exists "Eliminacion de imagenes" on storage.objects;
drop policy if exists "Subida de imagenes personal" on storage.objects;
drop policy if exists "Actualizacion de imagenes personal" on storage.objects;
drop policy if exists "Eliminacion de imagenes personal" on storage.objects;
create policy "Subida de imagenes personal" on storage.objects for insert with check (bucket_id = 'imagenes' and public.es_personal());
create policy "Actualizacion de imagenes personal" on storage.objects for update using (bucket_id = 'imagenes' and public.es_personal()) with check (bucket_id = 'imagenes' and public.es_personal());
create policy "Eliminacion de imagenes personal" on storage.objects for delete using (bucket_id = 'imagenes' and public.es_personal());


-- ====================================================================
-- 13. REALTIME (Sincronización en Vivo)
-- ====================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.productos, 
      public.categorias, 
      public.ventas, 
      public.configuracion,
      public.turnos_caja,
      public.inventario_movimientos,
      public.producciones,
      public.promociones;
  EXCEPTION 
    WHEN duplicate_object THEN
      NULL;
    WHEN OTHERS THEN
      NULL;
  END;
END $$;
`;
