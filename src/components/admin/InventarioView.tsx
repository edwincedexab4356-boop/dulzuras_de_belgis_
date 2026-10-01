import React, { useState, useMemo } from 'react';
import {
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  History,
  Check,
  X,
  PackageCheck,
  Trash2,
  KeyRound,
  ShieldAlert,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { Producto, MovimientoInventario, TipoMovimientoInventario, UserAuth } from '../../types';
import { inventarioService } from '../../services/inventarioService';
import { formatCurrency, formatFechaCorta } from '../../utils/formatters';

interface InventarioViewProps {
  productos: Producto[];
  movimientos: MovimientoInventario[];
  user: UserAuth;
  onRefreshData?: () => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  productos,
  movimientos,
  user,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'movimientos'>('stock');
  const [search, setSearch] = useState('');
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] = useState<Producto | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimientoInventario>('salida');
  const [cantidadAjuste, setCantidadAjuste] = useState<number>(1);
  const [motivoAjuste, setMotivoAjuste] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Security code modals
  const [movimientoToDelete, setMovimientoToDelete] = useState<MovimientoInventario | null>(null);
  const [codeDeleteMov, setCodeDeleteMov] = useState('');
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [codeClearAll, setCodeClearAll] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [syncingFirestore, setSyncingFirestore] = useState(false);

  const handleSyncFirestore = async () => {
    if (!productos || productos.length === 0) {
      setSuccessMsg('No hay productos para sincronizar.');
      setTimeout(() => setSuccessMsg(null), 3000);
      return;
    }
    setSyncingFirestore(true);
    try {
      await inventarioService.sincronizarInventarioConFirestore(productos);
      setSuccessMsg(`✓ Sincronización exitosa: ${productos.length} productos y existencias guardados en Firebase Firestore.`);
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (e: any) {
      const err = String(e?.message || e);
      if (err.includes('permission') || err.includes('permisos') || err.includes('denied')) {
        alert('Firebase Firestore rechazó el guardado: Reglas de seguridad insuficientes. Asegúrate de que las reglas en tu consola de Firebase permitan lectura y escritura.');
      } else {
        alert('Aviso al sincronizar con Firestore: ' + err);
      }
    } finally {
      setSyncingFirestore(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return productos.filter((p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.categoria.toLowerCase().includes(search.toLowerCase())
    );
  }, [productos, search]);

  const handleOpenAdjustment = (prod: Producto, defaultType: TipoMovimientoInventario = 'salida') => {
    setSelectedProductForAdjustment(prod);
    setTipoMovimiento(defaultType);
    setCantidadAjuste(1);
    setMotivoAjuste('');
  };

  // Quick 1-click +1 or -1 stock change
  const handleQuickDelta = async (prod: Producto, delta: number) => {
    if (!prod.id) return;
    setLoading(true);
    try {
      const userName = user.displayName || user.email || 'Admin';
      if (delta > 0) {
        await inventarioService.registrarEntrada(prod, 1, 'Entrada rápida (+1 ud)', userName);
        setSuccessMsg(`+1 unidad añadida al stock de ${prod.nombre}`);
      } else {
        await inventarioService.registrarSalida(prod, 1, 'Salida rápida (-1 ud)', userName);
        setSuccessMsg(`-1 unidad quitada del stock de ${prod.nombre}`);
      }
      onRefreshData?.();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert('Error al modificar stock: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjustment || cantidadAjuste <= 0) return;
    setLoading(true);

    try {
      const userName = user.displayName || user.email || 'Admin';
      if (tipoMovimiento === 'entrada') {
        await inventarioService.registrarEntrada(
          selectedProductForAdjustment,
          cantidadAjuste,
          motivoAjuste.trim() || 'Entrada manual de inventario',
          userName
        );
        setSuccessMsg(`+${cantidadAjuste} unidades agregadas a ${selectedProductForAdjustment.nombre}`);
      } else if (tipoMovimiento === 'salida') {
        await inventarioService.registrarSalida(
          selectedProductForAdjustment,
          cantidadAjuste,
          motivoAjuste.trim() || 'Salida manual / Quitar del stock',
          userName
        );
        setSuccessMsg(`-${cantidadAjuste} unidades quitadas del stock de ${selectedProductForAdjustment.nombre}`);
      } else if (tipoMovimiento === 'merma' || (tipoMovimiento as any) === 'desperdicio') {
        await inventarioService.registrarDesperdicio(
          selectedProductForAdjustment,
          cantidadAjuste,
          motivoAjuste.trim() || 'Merma / Producto dañado',
          userName
        );
        setSuccessMsg(`-${cantidadAjuste} unidades registradas como merma para ${selectedProductForAdjustment.nombre}`);
      } else {
        await inventarioService.registrarAjuste(
          selectedProductForAdjustment,
          cantidadAjuste,
          motivoAjuste.trim() || 'Ajuste manual de stock',
          userName
        );
        setSuccessMsg(`Stock actualizado a ${cantidadAjuste} unidades para ${selectedProductForAdjustment.nombre}`);
      }

      setSelectedProductForAdjustment(null);
      onRefreshData?.();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete single movement with security code 0000
  const handleConfirmDeleteMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movimientoToDelete || !movimientoToDelete.id) return;
    if (codeDeleteMov !== '0000') {
      setCodeError('Código de seguridad incorrecto. El código requerido es 0000.');
      return;
    }

    setLoading(true);
    try {
      await inventarioService.deleteMovimiento(movimientoToDelete.id);
      setSuccessMsg('Movimiento eliminado de la bitácora y de Firebase exitosamente.');
      setMovimientoToDelete(null);
      setCodeDeleteMov('');
      setCodeError(null);
      onRefreshData?.();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert('Error al eliminar movimiento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear all movements with security code 0000
  const handleConfirmClearAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeClearAll !== '0000') {
      setCodeError('Código de seguridad incorrecto. El código requerido es 0000.');
      return;
    }

    setLoading(true);
    try {
      await inventarioService.clearAllMovimientos();
      setSuccessMsg('Bitácora de movimientos vaciada por completo en Firebase.');
      setIsClearAllModalOpen(false);
      setCodeClearAll('');
      setCodeError(null);
      onRefreshData?.();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert('Error al vaciar bitácora: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-amber-600" />
            <span>Control de Inventario en Tiempo Real</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Supervisa existencias, reduce o añade stock y administra la bitácora de movimientos en Firebase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncFirestore}
            disabled={syncingFirestore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Forzar subida de existencias actuales a Firestore"
          >
            {syncingFirestore ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-amber-700" />
            )}
            <span>{syncingFirestore ? 'Sincronizando...' : 'Sincronizar con Firebase'}</span>
          </button>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Guardado automático en Firestore</span>
          </span>

          <div className="flex items-center p-1 bg-stone-200/80 rounded-xl">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'stock'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Existencias por Producto
            </button>
            <button
              onClick={() => setActiveTab('movimientos')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'movimientos'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Bitácora de Movimientos ({movimientos.length})
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STOCK VIEW */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar en inventario por producto o categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Óptimo</span>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-2"></span>
              <span>Bajo</span>
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 ml-2"></span>
              <span>Agotado</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            {/* Mobile Card List (under md breakpoint) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  No se encontraron productos en el inventario.
                </div>
              ) : (
                filteredProducts.map((prod, idx) => {
                  const currentStock = prod.stock ?? 0;
                  const minStock = prod.stockMinimo ?? 5;
                  const isLow = currentStock <= minStock && currentStock > 0;
                  const isZero = currentStock <= 0;

                  return (
                    <div key={prod.id ? `mob-inv-${prod.id}-${idx}` : `mob-inv-prod-${idx}`} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-stone-900 text-sm">{prod.nombre}</h4>
                          <span className="text-[11px] text-stone-500">{prod.categoria} • {formatCurrency(prod.precio)}</span>
                          <div className="text-[10px] text-stone-400 mt-0.5">Mínimo sugerido: {minStock} uds.</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono text-base font-bold ${
                              isZero
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {currentStock} <span className="text-[10px] text-stone-400 font-normal">uds.</span>
                          </span>
                          {isZero && (
                            <span className="block px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold mt-0.5">
                              Agotado
                            </span>
                          )}
                          {isLow && (
                            <span className="block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold mt-0.5">
                              Stock Bajo
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                        {/* Quick 1-click +1 and -1 */}
                        <div className="inline-flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                          <button
                            onClick={() => handleQuickDelta(prod, -1)}
                            disabled={loading || currentStock <= 0}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-stone-200 flex items-center justify-center font-bold text-xs shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                            title="Quitar 1 unidad directamente del stock"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 font-mono text-xs font-bold text-stone-700">
                            {currentStock}
                          </span>
                          <button
                            onClick={() => handleQuickDelta(prod, 1)}
                            disabled={loading}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-stone-200 flex items-center justify-center font-bold text-xs shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                            title="Sumar 1 unidad al stock"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Adjust buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenAdjustment(prod, 'salida')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            - Salida
                          </button>
                          <button
                            onClick={() => handleOpenAdjustment(prod, 'entrada')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            + Entrada
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Producto</th>
                    <th className="p-3.5">Categoría</th>
                    <th className="p-3.5">Precio</th>
                    <th className="p-3.5">Stock Mínimo</th>
                    <th className="p-3.5">Stock Actual</th>
                    <th className="p-3.5">Ajuste Rápido (1 Clic)</th>
                    <th className="p-3.5 text-right">Gestión de Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-400">
                        No se encontraron productos en el inventario.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod, idx) => {
                      const currentStock = prod.stock ?? 0;
                      const minStock = prod.stockMinimo ?? 5;
                      const isLow = currentStock <= minStock && currentStock > 0;
                      const isZero = currentStock <= 0;

                      return (
                        <tr key={prod.id ? `${prod.id}-${idx}` : `prod-${idx}`} className="hover:bg-stone-50/50">
                          <td className="p-3.5">
                            <div className="font-bold text-stone-900">{prod.nombre}</div>
                            <div className="text-[11px] text-stone-400">{prod.descripcion?.slice(0, 40)}...</div>
                          </td>
                          <td className="p-3.5 text-stone-500">{prod.categoria}</td>
                          <td className="p-3.5 font-serif font-bold text-stone-800">
                            {formatCurrency(prod.precio)}
                          </td>
                          <td className="p-3.5 text-stone-500">{minStock} uds.</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-base font-bold ${
                                  isZero
                                    ? 'text-rose-600'
                                    : isLow
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {currentStock}
                              </span>
                              <span className="text-[11px] text-stone-400">uds.</span>
                              {isZero && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                  Agotado
                                </span>
                              )}
                              {isLow && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  Bajo
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Quick 1-click +1 and -1 */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                              <button
                                onClick={() => handleQuickDelta(prod, -1)}
                                disabled={loading || currentStock <= 0}
                                className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-stone-200 flex items-center justify-center font-bold text-xs shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                                title="Quitar 1 unidad directamente del stock"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-1.5 font-mono text-xs font-bold text-stone-700">
                                {currentStock}
                              </span>
                              <button
                                onClick={() => handleQuickDelta(prod, 1)}
                                disabled={loading}
                                className="w-7 h-7 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-stone-200 flex items-center justify-center font-bold text-xs shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                                title="Sumar 1 unidad al stock"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                            <button
                              onClick={() => handleOpenAdjustment(prod, 'salida')}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                              title="Quitar stock por venta, merma o retiro"
                            >
                              - Quitar Stock
                            </button>
                            <button
                              onClick={() => handleOpenAdjustment(prod, 'entrada')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                              title="Añadir stock por compra o ingreso"
                            >
                              + Entrada
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MOVEMENTS LOG VIEW */}
      {activeTab === 'movimientos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <div>
              <span className="text-xs font-bold text-stone-800 block">
                Historial de Movimientos de Inventario
              </span>
              <span className="text-[11px] text-stone-500">
                Cada entrada, salida o ajuste se registra y sincroniza en Firebase.
              </span>
            </div>

            {movimientos.length > 0 && (
              <button
                onClick={() => {
                  setIsClearAllModalOpen(true);
                  setCodeClearAll('');
                  setCodeError(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Vaciar Bitácora Completa</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Fecha</th>
                    <th className="p-3.5">Producto</th>
                    <th className="p-3.5">Tipo</th>
                    <th className="p-3.5">Cantidad</th>
                    <th className="p-3.5">Motivo</th>
                    <th className="p-3.5">Responsable</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-400">
                        No hay registros de movimientos en la bitácora actualmente.
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((mov, idx) => {
                      const isEntrada = mov.tipo === 'entrada' || mov.tipo === 'produccion';
                      return (
                        <tr key={mov.id ? `${mov.id}-${idx}` : `mov-${idx}`} className="hover:bg-stone-50/50">
                          <td className="p-3.5 text-stone-400 whitespace-nowrap">
                            {formatFechaCorta(mov.createdAt || mov.fecha)}
                          </td>
                          <td className="p-3.5 font-bold text-stone-900">
                            {mov.productoNombre || mov.producto}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isEntrada
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isEntrada ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              <span>{mov.tipo}</span>
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            <span className={isEntrada ? 'text-emerald-700' : 'text-rose-700'}>
                              {isEntrada ? `+${mov.cantidad}` : `-${mov.cantidad}`} uds.
                            </span>
                          </td>
                          <td className="p-3.5 text-stone-700">{mov.motivo}</td>
                          <td className="p-3.5 text-stone-500">{mov.usuario || 'Sistema'}</td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setMovimientoToDelete(mov);
                                setCodeDeleteMov('');
                                setCodeError(null);
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar este movimiento de la bitácora y Firebase"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal (Entrada, Salida, Merma) */}
      {selectedProductForAdjustment && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Ajustar Stock de Inventario
                </h3>
                <p className="text-xs text-stone-500 truncate max-w-[240px]">
                  {selectedProductForAdjustment.nombre}
                </p>
              </div>
              <button
                onClick={() => setSelectedProductForAdjustment(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Tipo de Operación
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTipoMovimiento('salida')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      tipoMovimiento === 'salida'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <span>- Quitar</span>
                    <span className="text-[9px] opacity-80">(Salida)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoMovimiento('entrada')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      tipoMovimiento === 'entrada'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <span>+ Sumar</span>
                    <span className="text-[9px] opacity-80">(Entrada)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoMovimiento('merma')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      tipoMovimiento === 'merma'
                        ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <span>- Merma</span>
                    <span className="text-[9px] opacity-80">(Dañado)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Cantidad a {tipoMovimiento === 'entrada' ? 'Ingresar' : 'Descontar'} (uds)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cantidadAjuste}
                  onChange={(e) => setCantidadAjuste(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white font-bold"
                />
              </div>

              {/* Calculation summary */}
              <div className="p-3 rounded-xl bg-stone-100 text-xs space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>Stock actual:</span>
                  <span className="font-bold">{selectedProductForAdjustment.stock ?? 0} uds.</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Nuevo stock resultante:</span>
                  <span
                    className={
                      tipoMovimiento === 'entrada'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }
                  >
                    {tipoMovimiento === 'entrada'
                      ? (selectedProductForAdjustment.stock ?? 0) + cantidadAjuste
                      : Math.max(0, (selectedProductForAdjustment.stock ?? 0) - cantidadAjuste)}{' '}
                    uds.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Motivo o Justificación
                </label>
                <input
                  type="text"
                  placeholder={
                    tipoMovimiento === 'salida'
                      ? 'Ej. Retiro de almacén, degustación...'
                      : tipoMovimiento === 'merma'
                      ? 'Ej. Descongelamiento, empaque roto...'
                      : 'Ej. Compra de ingredientes, recepción...'
                  }
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer ${
                    tipoMovimiento === 'entrada'
                      ? 'bg-emerald-700 hover:bg-emerald-600'
                      : 'bg-rose-700 hover:bg-rose-600'
                  }`}
                >
                  {loading
                    ? 'Actualizando...'
                    : tipoMovimiento === 'entrada'
                    ? 'Aplicar Entrada (+)'
                    : 'Quitar del Stock (-)'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProductForAdjustment(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Modal: Delete Single Movement (Code 0000) */}
      {movimientoToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Eliminar Registro de Bitácora
                </h3>
                <span className="text-[11px] text-stone-500">
                  Se eliminará permanentemente de Firebase
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Estás por eliminar el registro de{' '}
              <strong className="text-stone-900">
                {movimientoToDelete.productoNombre || movimientoToDelete.producto}
              </strong>{' '}
              ({movimientoToDelete.tipo}: {movimientoToDelete.cantidad} uds.).
            </p>

            <form onSubmit={handleConfirmDeleteMovimiento} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span>Código de Seguridad (0000)</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  autoFocus
                  placeholder="0000"
                  value={codeDeleteMov}
                  onChange={(e) => {
                    setCodeDeleteMov(e.target.value);
                    setCodeError(null);
                  }}
                  className="w-full px-3 py-2 text-center tracking-widest text-lg font-mono rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                {codeError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {codeError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || codeDeleteMov.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Eliminando...' : 'Confirmar y Eliminar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMovimientoToDelete(null);
                    setCodeDeleteMov('');
                    setCodeError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Modal: Clear All Movements (Code 0000) */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Vaciar Bitácora de Movimientos
                </h3>
                <span className="text-[11px] text-stone-500">
                  Acción irreversible en Firebase
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Esta acción eliminará <strong className="text-rose-700">TODOS</strong> los{' '}
              {movimientos.length} registros de movimientos almacenados en Firebase Firestore. Los stocks actuales de los productos permanecerán intactos.
            </p>

            <form onSubmit={handleConfirmClearAll} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span>Ingresa el código 0000 para confirmar</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  autoFocus
                  placeholder="0000"
                  value={codeClearAll}
                  onChange={(e) => {
                    setCodeClearAll(e.target.value);
                    setCodeError(null);
                  }}
                  className="w-full px-3 py-2 text-center tracking-widest text-lg font-mono rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                {codeError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {codeError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || codeClearAll.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Vaciando...' : 'Vaciar Bitácora Ahora'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsClearAllModalOpen(false);
                    setCodeClearAll('');
                    setCodeError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
