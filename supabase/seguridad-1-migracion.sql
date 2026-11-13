-- Dulzuras de Belgi's: paso de Firebase a Supabase (2026-11-12)
-- Se puede volver a ejecutar sin romper nada.

-- 1) Fechas como texto ISO (igual que las guardaba la app en Firebase)
do $$
declare r record;
begin
  for r in
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and data_type = 'timestamp with time zone'
  loop
    execute format('alter table public.%I alter column %I drop default', r.table_name, r.column_name);
    execute format($f$alter table public.%I alter column %I type text using to_char(%I at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')$f$, r.table_name, r.column_name, r.column_name);
    if r.column_name <> 'fecha_anulacion' then
      execute format($f$alter table public.%I alter column %I set default to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')$f$, r.table_name, r.column_name);
    end if;
  end loop;
end $$;

-- 2) Tablas nuevas que usa la app
create table if not exists public.pedidos (id text primary key, extra jsonb not null default '{}'::jsonb, created_at text default to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
create table if not exists public.clientes (id text primary key, extra jsonb not null default '{}'::jsonb, created_at text default to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

-- 3) Columna "extra" para los datos que no tienen columna propia, y columnas opcionales
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename <> 'configuracion' loop
    execute format($f$alter table public.%I add column if not exists extra jsonb not null default '{}'::jsonb$f$, r.tablename);
  end loop;
  for r in
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and is_nullable = 'NO' and column_name not in ('id', 'extra', 'data')
  loop
    execute format('alter table public.%I alter column %I drop not null', r.table_name, r.column_name);
  end loop;
end $$;

-- 4) Roles: la app usa "admin" y "caja"
update public.usuarios set role = 'caja' where role = 'cajero';
update public.usuarios set rol = 'caja' where rol = 'cajero';
alter table public.usuarios alter column role set default 'caja';
alter table public.usuarios alter column rol set default 'caja';

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
create policy admin_crea on public.productos for insert with check (public.es_admin());
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

-- 8) Cambios en vivo (el panel se actualiza solo)
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = r.tablename) then
      execute format('alter publication supabase_realtime add table public.%I', r.tablename);
    end if;
  end loop;
end $$;

-- 9) Datos que había en Firebase
insert into public.categorias (id, nombre, descripcion, imagen, activa, orden, updated_at) values
  ('cat-1', 'Dulcería', 'Alfajores, brownies y bocadillos dulces', '', true, 1, '2026-09-24T23:29:34.890Z'),
  ('cat-1789945082120', 'bebidas', 'jugo', '', true, 1, '2026-09-29T23:16:55.100Z')
on conflict (id) do nothing;

-- Configuración: se queda la de Supabase (más nueva) y se agregan los textos de promoción que solo estaban en Firebase
update public.configuracion
set data = '{"promocionTitulo": "20%off  en los productos selecionados", "promocionTexto": "endulza tus celebraciones", "promocionBotonTexto": "ver oferta especuialeds", "promocionBadge": "promo del dia"}'::jsonb || data
where id = 'negocio';
