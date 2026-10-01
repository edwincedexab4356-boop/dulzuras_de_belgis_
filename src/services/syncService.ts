import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { productosService } from './productosService';
import { categoriasService } from './categoriasService';
import { produccionService } from './produccionService';
import { inventarioService } from './inventarioService';
import { ventasService } from './ventasService';
import { configuracionService } from './configuracionService';

export interface SyncResult {
  productosCount: number;
  categoriasCount: number;
  produccionesCount: number;
  movimientosCount: number;
  ventasCount: number;
  success: boolean;
  errorMessage?: string;
}

export const syncService = {
  /**
   * Sube todos los datos almacenados localmente hacia las tablas de Supabase
   */
  async sincronizarTodoConSupabase(): Promise<SyncResult> {
    const client = getSupabaseClient();
    if (!isSupabaseConfigured() || !client) {
      throw new Error('Supabase no está configurado. Por favor ingresa tu URL y Anon Key.');
    }

    const result: SyncResult = {
      productosCount: 0,
      categoriasCount: 0,
      produccionesCount: 0,
      movimientosCount: 0,
      ventasCount: 0,
      success: false,
    };

    const now = new Date().toISOString();

    // 1. Configuración
    try {
      const cfg = configuracionService.getLocalConfiguracion();
      await client.from('configuracion').upsert({
        id: 'negocio',
        data: cfg,
        updated_at: now,
      });
    } catch (e) {
      console.warn('Sync configuracion to Supabase error:', e);
    }

    // 2. Categorías
    const localCategorias = categoriasService.getLocalCategorias();
    if (localCategorias.length > 0) {
      const catRows = localCategorias
        .filter((c) => Boolean(c.id))
        .map((c) => ({
          id: c.id!,
          nombre: c.nombre,
          descripcion: c.descripcion || '',
          imagen: c.imagen || '',
          activa: c.activa !== false,
          orden: Number(c.orden) || 1,
          updated_at: now,
        }));
      const { error } = await client.from('categorias').upsert(catRows, { onConflict: 'id' });
      if (!error) {
        result.categoriasCount = localCategorias.length;
      }
    }

    // 3. Productos
    const localProductos = productosService.getLocalProductos();
    if (localProductos.length > 0) {
      const prodRows = localProductos
        .filter((p) => Boolean(p.id))
        .map((p) => ({
          id: p.id!,
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          precio: Number(p.precio) || 0,
          costo: Number(p.costo) || 0,
          categoria: p.categoria || 'Dulcería',
          imagen: p.imagen || '',
          disponible: p.disponible !== false,
          activo: p.activo !== false,
          stock: Number(p.stock) || 0,
          stock_minimo: Number(p.stockMinimo) || 0,
          created_at: p.createdAt || now,
          updated_at: now,
        }));
      const { error } = await client.from('productos').upsert(prodRows, { onConflict: 'id' });
      if (!error) {
        result.productosCount = localProductos.length;
      }
    }

    // 4. Producciones
    const localProducciones = produccionService.getLocalProducciones();
    if (localProducciones.length > 0) {
      const prodRows = localProducciones
        .filter((pr) => Boolean(pr.id))
        .map((pr) => ({
          id: pr.id!,
          producto_id: pr.productoId,
          producto: pr.producto,
          cantidad: pr.cantidad,
          costo_unitario: pr.costoUnitario,
          costo_total: pr.costoTotal,
          fecha: pr.fecha,
          hora: pr.hora,
          responsable: pr.responsable,
          notas: pr.notas,
          created_at: pr.createdAt || now,
        }));
      const { error } = await client.from('producciones').upsert(prodRows, { onConflict: 'id' });
      if (!error) {
        result.produccionesCount = localProducciones.length;
      }
    }

    // 5. Movimientos
    const localMovs = inventarioService.getLocalMovimientos();
    if (localMovs.length > 0) {
      const movRows = localMovs
        .filter((m) => Boolean(m.id))
        .map((m) => ({
          id: m.id!,
          producto_id: m.productoId,
          producto: m.producto,
          producto_nombre: m.productoNombre,
          tipo: m.tipo,
          cantidad: m.cantidad,
          cantidad_anterior: m.cantidadAnterior,
          cantidad_nueva: m.cantidadNueva,
          diferencia: m.diferencia,
          motivo: m.motivo,
          usuario: m.usuario,
          fecha: m.fecha || now,
        }));
      const { error } = await client.from('inventario_movimientos').upsert(movRows, { onConflict: 'id' });
      if (!error) {
        result.movimientosCount = localMovs.length;
      }
    }

    // 6. Ventas
    const localVentas = ventasService.getLocalVentas();
    if (localVentas.length > 0) {
      const ventasRows = localVentas
        .filter((v) => Boolean(v.id))
        .map((v) => ({
          id: v.id!,
          numero_factura: v.numeroFactura,
          fecha: v.fecha,
          hora: v.hora,
          items: v.items,
          subtotal: v.subtotal,
          descuento: v.descuento,
          itbms: v.itbms,
          total: v.total,
          metodo_pago: v.metodoPago,
          monto_recibido: v.montoRecibido,
          cambio: v.cambio,
          usuario: v.usuario,
          cajero_jornada: v.cajeroJornada,
          tipo_venta: v.tipoVenta,
          created_at: v.createdAt || now,
        }));
      const { error } = await client.from('ventas').upsert(ventasRows, { onConflict: 'id' });
      if (!error) {
        result.ventasCount = localVentas.length;
      }
    }

    result.success = true;
    return result;
  },

  // Backward compatibility alias
  async sincronizarTodoConFirestore(): Promise<SyncResult> {
    return this.sincronizarTodoConSupabase();
  },
};
