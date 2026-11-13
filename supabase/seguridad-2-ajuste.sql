-- Seguridad aplicada a Supabase el 2026-11-12 (ya está ejecutada; queda como registro).
-- Público: solo LEE productos, categorías, configuración y promociones.
-- Personal (fila activa en "usuarios" con el id de su cuenta de Supabase): ventas, inventario,
--   producción, turnos de caja, crear/editar productos y subir fotos.
-- Administrador (role = 'admin'): categorías, configuración, promociones, usuarios, borrar productos y ventas.
-- vincular_mi_usuario(): enlaza un usuario agregado por correo con su cuenta (solo con correo confirmado).
-- Se quitó el trigger handle_new_user: daba acceso (y permitía elegir el rol) a cualquiera que se registrara.
-- Script completo: supabase/seguridad-1-migracion.sql (los datos de configuración que agregaba se revirtieron después)
-- más este cambio posterior:
drop policy if exists admin_crea on public.productos;
drop policy if exists personal_crea on public.productos;
create policy personal_crea on public.productos for insert with check (public.es_personal());
