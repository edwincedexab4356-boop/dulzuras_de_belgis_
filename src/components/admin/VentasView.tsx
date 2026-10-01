import React, { useState, useMemo, useEffect } from 'react';
import {
  BadgeDollarSign,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Receipt,
  User,
  Smartphone,
  CreditCard,
  Banknote,
  Check,
  X,
  AlertCircle,
  Clock,
  Printer,
  Minus,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  BarChart3,
  Calendar,
  CalendarDays,
  ArrowRight,
  DollarSign,
  Lock,
  Unlock,
} from 'lucide-react';
import { Venta, Producto, MetodoPago, VentaItem, UserAuth, ConfiguracionNegocio, AdminTab } from '../../types';
import { ventasService } from '../../services/ventasService';
import { authService } from '../../services/authService';
import { formatCurrency, formatFechaCorta, getPanamaTodayYMD } from '../../utils/formatters';
import { ResumenVentasView } from './ResumenVentasView';

interface VentasViewProps {
  ventas: Venta[];
  productos: Producto[];
  user: UserAuth;
  config?: ConfiguracionNegocio;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: AdminTab) => void;
}

export const VentasView: React.FC<VentasViewProps> = ({
  ventas,
  productos,
  user,
  config,
  onRefreshData,
  onNavigateTab,
}) => {
  // If user is admin, default to sales history; if cashier, default to POS
  const isAdmin = user.role === 'admin';
  const canAdminBuy = Boolean(config?.permitirAdminCompras);
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'historial' | 'resumen'>(
    isAdmin ? 'historial' : 'pos'
  );

  // Active cashier
  const [activeCajero, setActiveCajero] = useState<string>(
    user.cajeroJornada || user.displayName || (user.email ? user.email.split('@')[0] : 'Cajero')
  );
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [shiftNameInput, setShiftNameInput] = useState<string>('');

  // POS State
  const [posCart, setPosCart] = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [productSearch, setProductSearch] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState<string>('Cliente Ocasional');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [notasVenta, setNotasVenta] = useState<string>('');
  const [loadingSale, setLoadingSale] = useState<boolean>(false);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);

  // History State
  const [historySearch, setHistorySearch] = useState<string>('');
  const [selectedVentaTicket, setSelectedVentaTicket] = useState<Venta | null>(null);

  // Deletion with Security Code "0000"
  const [ventaToDelete, setVentaToDelete] = useState<Venta | null>(null);
  const [securityCode, setSecurityCode] = useState<string>('');
  const [deleteErrorCode, setDeleteErrorCode] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Clear all sales modal state
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState<boolean>(false);
  const [clearAllSecurityCode, setClearAllSecurityCode] = useState<string>('');
  const [clearAllErrorCode, setClearAllErrorCode] = useState<string | null>(null);

  // Today's summary calculation for badge and header
  const hoyInfo = useMemo(() => {
    const todayStr = getPanamaTodayYMD();
    const validToday = ventas.filter(
      (v) => !v.anulada && (v.fecha === todayStr || v.createdAt?.startsWith(todayStr))
    );
    const totalHoy = validToday.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    return {
      count: validToday.length,
      total: totalHoy,
      fechaStr: todayStr,
    };
  }, [ventas]);

  // Categories for POS filter
  const categorias = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return ['Todas', ...Array.from(set)];
  }, [productos]);

  // Filtered products for POS
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = selectedCategoria === 'Todas' || p.categoria === selectedCategoria;
      const matchSearch =
        p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.categoria.toLowerCase().includes(productSearch.toLowerCase());
      return matchCat && matchSearch && p.disponible !== false;
    });
  }, [productos, selectedCategoria, productSearch]);

  // POS Calculations
  const subtotal = posCart.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0);
  const total = subtotal;
  const recibidoNum = parseFloat(montoRecibido) || 0;
  const cambio = metodoPago === 'Efectivo' && recibidoNum >= total ? recibidoNum - total : 0;

  // Add to POS Cart with highlight feedback
  const handleAddToCart = (producto: Producto) => {
    if (producto.id) {
      setRecentlyAddedId(producto.id);
      setTimeout(() => setRecentlyAddedId(null), 1000);
    }
    setPosCart((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      if (existing) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const handleUpdateQty = (prodId: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === prodId) {
            const newQty = item.cantidad + delta;
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { producto: Producto; cantidad: number }[]
    );
  };

  const handleRemoveItem = (prodId: string) => {
    setPosCart((prev) => prev.filter((item) => item.producto.id !== prodId));
  };

  const handleClearPos = () => {
    setPosCart([]);
    setMontoRecibido('');
    setNotasVenta('');
    setClienteNombre('Cliente Ocasional');
  };

  // Process POS Sale
  const handleFinalizarVenta = async () => {
    if (posCart.length === 0) return;
    if (isAdmin) {
      alert(
        'Por política del negocio, el Administrador puede registrar y gestionar productos, más no realizar ventas. La emisión de tickets y cobros en el POS son exclusivos para el rol de Cajero.'
      );
      return;
    }
    setLoadingSale(true);

    try {
      const items: VentaItem[] = posCart.map((item) => ({
        productoId: item.producto.id || '',
        nombre: item.producto.nombre,
        categoria: item.producto.categoria,
        precio: item.producto.precio,
        cantidad: item.cantidad,
        subtotal: item.producto.precio * item.cantidad,
      }));

      const nuevaVenta = await ventasService.registrarVenta({
        cliente: clienteNombre.trim() || 'Cliente Ocasional',
        items,
        total,
        metodoPago,
        montoRecibido: metodoPago === 'Efectivo' ? recibidoNum : total,
        cambio: metodoPago === 'Efectivo' ? cambio : 0,
        notas: notasVenta.trim(),
        vendedor: activeCajero || user.displayName || user.email || 'Cajero',
        fecha: new Date().toISOString(),
      });

      setSaleSuccessMessage(`¡Venta #${nuevaVenta.id?.slice(-5) || ''} registrada con éxito por ${formatCurrency(total)}!`);
      setSelectedVentaTicket(nuevaVenta);
      handleClearPos();
      onRefreshData?.();
      setTimeout(() => setSaleSuccessMessage(null), 5000);
    } catch (err: any) {
      alert('Error al registrar la venta: ' + err.message);
    } finally {
      setLoadingSale(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return ventas.filter((v) => {
      const matchSearch =
        (v.cliente || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (v.id || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (v.metodoPago || '').toLowerCase().includes(historySearch.toLowerCase());
      return matchSearch;
    });
  }, [ventas, historySearch]);

  // Deletion with Security Code 0000
  const handleConfirmDeleteVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventaToDelete) return;

    if (securityCode.trim() !== '0000') {
      setDeleteErrorCode('Código incorrecto. Debe ingresar el código de seguridad 0000.');
      return;
    }

    setIsDeleting(true);
    setDeleteErrorCode(null);

    try {
      await ventasService.deleteVenta(ventaToDelete, {
        restaurarStock: true,
        allProductos: productos,
        usuario: user.displayName || user.email || 'Admin',
      });
      setSaleSuccessMessage(
        `Venta #${ventaToDelete.numeroVenta || ventaToDelete.id?.slice(-6)} eliminada permanentemente de Firebase y stock restaurado.`
      );
      setVentaToDelete(null);
      setSecurityCode('');
      onRefreshData?.();
      setTimeout(() => setSaleSuccessMessage(null), 4000);
    } catch (err: any) {
      setDeleteErrorCode('Error al eliminar la venta: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmClearAllVentas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clearAllSecurityCode.trim() !== '0000') {
      setClearAllErrorCode('Código incorrecto. Debe ingresar el código de seguridad 0000.');
      return;
    }

    setIsDeleting(true);
    setClearAllErrorCode(null);

    try {
      await ventasService.clearAllVentas();
      setSaleSuccessMessage('Historial de ventas vaciado por completo en Firebase. Total de ventas restablecido a 0.');
      setIsClearAllModalOpen(false);
      setClearAllSecurityCode('');
      onRefreshData?.();
      setTimeout(() => setSaleSuccessMessage(null), 4000);
    } catch (err: any) {
      setClearAllErrorCode('Error al vaciar ventas: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnularVenta = async (ventaId: string) => {
    if (!window.confirm('¿Estás seguro de anular esta venta? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await ventasService.anularVenta(ventaId);
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al anular venta: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Sub-tabs and Cashier Shift Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
              <BadgeDollarSign className="w-7 h-7 text-pink-600" />
              <span>Ventas y Caja</span>
            </h1>
            {/* Active Cashier Shift Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cajero: <strong className="font-extrabold">{activeCajero}</strong></span>
              <button
                type="button"
                onClick={() => {
                  setShiftNameInput(activeCajero);
                  setIsShiftModalOpen(true);
                }}
                className="ml-1 text-[11px] font-bold text-pink-700 hover:text-pink-900 underline cursor-pointer"
                title="Cambiar responsable de jornada"
              >
                Cambiar
              </button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Punto de facturación para cajero, control de ingresos en tiempo real y registro histórico de transacciones.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center p-1 bg-stone-200/80 rounded-xl">
          <button
            onClick={() => setActiveSubTab('pos')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'pos'
                ? 'bg-white text-pink-700 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Punto de Venta (POS) {isAdmin && '(Solo Cajero)'}
          </button>
          <button
            onClick={() => setActiveSubTab('historial')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'historial'
                ? 'bg-white text-pink-700 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Historial de Ventas ({ventas.length})
          </button>
          <button
            onClick={() => setActiveSubTab('resumen')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'resumen'
                ? 'bg-white text-pink-700 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-pink-600" />
            <span>Resúmenes de Venta</span>
          </button>
        </div>
      </div>

      {/* Admin Information Note: Admin view restriction notice */}
      {isAdmin && activeSubTab === 'pos' && (
        <div className="p-3.5 rounded-2xl bg-amber-100/70 border border-amber-300 text-amber-950 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <strong className="block text-amber-900 font-bold">Acceso Restringido: El Administrador no realiza ventas</strong>
            <span>El rol Administrador puede registrar y gestionar productos en el catálogo, pero <strong>no tiene permitido realizar cobros ni ventas</strong>. Para registrar una venta en caja, inicie sesión con una cuenta de Cajero.</span>
          </div>
        </div>
      )}

      {saleSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saleSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaleSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* POS VIEW */}
      {activeSubTab === 'pos' && isAdmin && (
        <div className="p-8 rounded-3xl bg-amber-50 border border-amber-200 text-center max-w-xl mx-auto my-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-amber-950 mb-1">
            Modo Administrador: Cobro en Caja Deshabilitado
          </h3>
          <p className="text-xs text-amber-900 leading-relaxed mb-4">
            Por política de seguridad y arqueo de caja, el Administrador tiene acceso a reportes, inventarios, configuración y productos, pero <strong>no realiza cobros ni ventas directas</strong>.
          </p>
          <div className="bg-white p-3.5 rounded-2xl border border-amber-200 text-xs text-stone-700 font-medium">
            💡 Para registrar ventas en el Punto de Venta, inicia sesión con tu correo y la contraseña de cajero: <strong className="font-mono text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">cajeroadmin</strong>
          </div>
        </div>
      )}

      {/* POS VIEW (SOLO CAJERO) */}
      {activeSubTab === 'pos' && !isAdmin && (
        <div className="space-y-4">
          {/* Active Cashier Banner */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-pink-100 text-pink-700">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-sm text-stone-900">
                    Cajero: {activeCajero}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Terminal Habilitada
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Cobro directo en caja sin requerir apertura ni cierre de turnos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShiftNameInput(activeCajero);
                  setIsShiftModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
              >
                Cambiar Cajero
              </button>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('productos')}
                  className="px-3.5 py-1.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Registrar un nuevo producto en el catálogo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ingresar Producto</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Products Catalogue Section */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o categoría..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categorias.map((cat, idx) => (
                  <button
                    key={`${cat}-${idx}`}
                    onClick={() => setSelectedCategoria(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategoria === cat
                        ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid with Highlighting */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProductos.map((prod, idx) => {
                const isOutOfStock = prod.stock !== undefined && prod.stock <= 0;
                const cartItem = posCart.find((i) => i.producto.id === prod.id);
                const isSelected = Boolean(cartItem);
                const isRecentlyAdded = recentlyAddedId === prod.id;

                return (
                  <div
                    key={prod.id ? `${prod.id}-${idx}` : `prod-${idx}`}
                    onClick={() => !isOutOfStock && handleAddToCart(prod)}
                    className={`relative p-3 rounded-2xl border text-left flex flex-col justify-between transition-all select-none group cursor-pointer ${
                      isOutOfStock
                        ? 'bg-stone-50 border-stone-200 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'bg-pink-50/80 border-pink-500 ring-2 ring-pink-500 shadow-md shadow-pink-500/15'
                        : 'bg-white border-stone-200 hover:border-pink-400 hover:shadow-md'
                    } ${isRecentlyAdded ? 'scale-[1.03] ring-4 ring-lime-400 duration-150' : ''}`}
                  >
                    {/* Selected Highlight Badge */}
                    {isSelected && cartItem && (
                      <div className="absolute -top-2.5 -right-2 z-10 flex items-center gap-1 bg-gradient-to-r from-pink-600 to-pink-700 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md animate-in zoom-in duration-150">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>{cartItem.cantidad} en factura</span>
                      </div>
                    )}

                    <div>
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-stone-100 mb-2 relative">
                        <img
                          src={prod.imagen || 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=300&q=80'}
                          alt={prod.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-pink-900/10 pointer-events-none" />
                        )}
                      </div>
                      <h4 className={`font-serif text-xs font-bold line-clamp-1 ${isSelected ? 'text-pink-950 font-extrabold' : 'text-stone-900'}`}>
                        {prod.nombre}
                      </h4>
                      <span className="text-[10px] text-stone-400 block">{prod.categoria}</span>
                    </div>

                    <div>
                      <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between">
                        <span className={`font-serif text-xs font-bold ${isSelected ? 'text-pink-700 font-extrabold' : 'text-stone-900'}`}>
                          {formatCurrency(prod.precio)}
                        </span>
                        <span className="text-[10px] text-stone-500 font-medium">
                          Stock: {prod.stock ?? 0}
                        </span>
                      </div>

                      {/* Inline Quick Quantity Controls if selected */}
                      {isSelected && cartItem && (
                        <div
                          className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-pink-200/80 bg-white/80 p-1 rounded-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(prod.id!, -1)}
                            className="w-6 h-6 rounded-lg bg-pink-100 text-pink-900 hover:bg-pink-200 flex items-center justify-center font-black text-xs cursor-pointer"
                            title="Restar una unidad"
                          >
                            <Minus className="w-3 h-3 stroke-[2.5]" />
                          </button>
                          <span className="text-xs font-black text-pink-900">
                            {cartItem.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(prod)}
                            className="w-6 h-6 rounded-lg bg-pink-600 text-white hover:bg-pink-700 flex items-center justify-center font-black text-xs cursor-pointer shadow-xs"
                            title="Sumar una unidad"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Mobile floating button to jump down to checkout */}
            {posCart.length > 0 && (
              <div className="lg:hidden sticky bottom-4 z-20">
                <button
                  type="button"
                  onClick={() => {
                    const ticketEl = document.getElementById('pos-ticket-checkout');
                    ticketEl?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 text-white font-bold text-xs shadow-lg flex items-center justify-between cursor-pointer animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>{posCart.reduce((acc, it) => acc + it.cantidad, 0)} productos en factura</span>
                  </div>
                  <div className="flex items-center gap-1 font-serif text-sm font-extrabold">
                    <span>{formatCurrency(total)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Ticket / Cart Checkout Section */}
          <div id="pos-ticket-checkout" className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-pink-600" />
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Ticket de Cobro
                  </h3>
                </div>
                {posCart.length > 0 && (
                  <button
                    onClick={handleClearPos}
                    className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Vaciar ticket
                  </button>
                )}
              </div>

              {/* Client Name Input */}
              <div className="pt-3 pb-2">
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {/* Items in cart */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {posCart.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs">
                    El ticket está vacío. Toca los productos a la izquierda para agregarlos.
                  </div>
                ) : (
                  posCart.map((item, idx) => (
                    <div
                      key={item.producto.id ? `${item.producto.id}-${idx}` : `cart-item-${idx}`}
                      className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className="font-serif text-xs font-bold text-stone-900 truncate">
                          {item.producto.nombre}
                        </h5>
                        <span className="text-[10px] text-stone-500">
                          {formatCurrency(item.producto.precio)} c/u
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateQty(item.producto.id!, -1)}
                          className="w-5 h-5 rounded bg-stone-200 text-stone-700 flex items-center justify-center text-xs hover:bg-stone-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-stone-800 w-4 text-center">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.producto.id!, 1)}
                          className="w-5 h-5 rounded bg-stone-200 text-stone-700 flex items-center justify-center text-xs hover:bg-stone-300 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right pl-2">
                        <span className="font-serif text-xs font-bold text-stone-900 block">
                          {formatCurrency(item.producto.precio * item.cantidad)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.producto.id!)}
                          className="text-stone-400 hover:text-rose-600 text-[10px] cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment Options and Totals */}
            <div className="pt-4 border-t border-stone-200 space-y-3">
              
              {/* Payment Methods */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Método de Pago
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Efectivo', 'Yappy', 'Tarjeta', 'Otro'] as MetodoPago[]).map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setMetodoPago(metodo)}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        metodoPago === metodo
                          ? 'bg-amber-900 border-amber-900 text-white shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash change calculator */}
              {metodoPago === 'Efectivo' && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-amber-900 block mb-0.5">
                      Efectivo Recibido ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-amber-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-900 block mb-0.5">
                      Cambio / Vuelto
                    </span>
                    <div className="text-xs font-bold text-amber-950 py-1">
                      {formatCurrency(cambio)}
                    </div>
                  </div>
                </div>
              )}

              {/* Totals Breakdown */}
              <div className="space-y-1 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-stone-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-100">
                  <span>Total a Cobrar:</span>
                  <span className="font-serif text-xl font-extrabold text-amber-950">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Submit Sale Button or Admin Policy Warning */}
              {isAdmin ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5 text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Ventas restringidas para Administrador</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Por política del negocio, el Administrador puede registrar y gestionar productos, <strong>más no realizar ventas</strong>. La emisión de tickets y cobro en POS es de uso exclusivo para cajeros.
                  </p>
                </div>
              ) : (
                <button
                  id="pos-submit-sale-btn"
                  onClick={handleFinalizarVenta}
                  disabled={posCart.length === 0 || loadingSale}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 active:bg-pink-900 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loadingSale ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Cobrar Venta ({formatCurrency(total)})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SALES HISTORY VIEW */}
      {activeSubTab === 'historial' && (
        <div className="space-y-4">
          {/* Daily Quick Summary Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-full">
                    Resumen del Día de Hoy
                  </span>
                  <span className="text-xs text-stone-500 font-mono">{hoyInfo.fechaStr}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 mt-0.5">
                  {hoyInfo.count} {hoyInfo.count === 1 ? 'venta realizada hoy' : 'ventas realizadas hoy'} · Recaudado:{' '}
                  <span className="font-serif text-amber-950 font-extrabold text-sm sm:text-base">
                    {formatCurrency(hoyInfo.total)}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveSubTab('resumen')}
              className="px-3.5 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-200" />
              <span>Ver Resúmenes (Día, Semana, Mes)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* Search bar & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente, ID o método de pago..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
              />
            </div>

            {ventas.length > 0 && (
              <button
                onClick={() => {
                  setIsClearAllModalOpen(true);
                  setClearAllSecurityCode('');
                  setClearAllErrorCode(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-xs"
                title="Vaciar todo el historial y poner ventas a 0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Historial (Poner en 0)</span>
              </button>
            )}
          </div>

          {/* Table & Mobile Cards */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            {/* Mobile Card List (under md breakpoint) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  No hay ventas registradas que coincidan con la búsqueda.
                </div>
              ) : (
                filteredHistory.map((venta, idx) => {
                  const isAnulada = Boolean(venta.anulada);
                  return (
                    <div
                      key={venta.id ? `mob-venta-${venta.id}-${idx}` : `mob-venta-${idx}`}
                      className={`p-4 space-y-2.5 ${isAnulada ? 'bg-rose-50/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-stone-900">
                              #{venta.id?.slice(-6) || 'VENTA'}
                            </span>
                            {isAnulada ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                Anulada
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                Completada
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            {formatFechaCorta(venta.createdAt || venta.fecha)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-serif font-extrabold text-amber-950 text-base block">
                            {formatCurrency(venta.total)}
                          </span>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                            {venta.metodoPago || 'Efectivo'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                        <div className="font-semibold text-stone-900 mb-0.5">
                          Cliente: {venta.cliente || 'Cliente Ocasional'}
                        </div>
                        <div className="text-stone-500 text-[11px]">
                          {venta.items && venta.items.length > 0
                            ? venta.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')
                            : `${venta.cantidad || 1}x ${venta.producto}`}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setSelectedVentaTicket(venta)}
                          className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-stone-500" />
                          <span>Ver Ticket</span>
                        </button>
                        {isAdmin && !isAnulada && (
                          <button
                            onClick={() => {
                              setVentaToDelete(venta);
                              setSecurityCode('');
                              setDeleteErrorCode(null);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">ID / Fecha</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Productos</th>
                    <th className="p-3.5">Método de Pago</th>
                    <th className="p-3.5">Total</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-400">
                        No hay ventas registradas que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((venta, idx) => {
                      const isAnulada = Boolean(venta.anulada);
                      return (
                        <tr key={venta.id ? `${venta.id}-${idx}` : `venta-${idx}`} className={isAnulada ? 'bg-rose-50/30 line-through text-stone-400' : 'hover:bg-stone-50/50'}>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-bold text-stone-800 block">
                              #{venta.id?.slice(-6) || 'VENTA'}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {formatFechaCorta(venta.createdAt || venta.fecha)}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-stone-900">
                            {venta.cliente || 'Cliente Ocasional'}
                          </td>
                          <td className="p-3.5">
                            {venta.items && venta.items.length > 0 ? (
                              <span className="text-xs">
                                {venta.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')}
                              </span>
                            ) : (
                              <span>{venta.cantidad || 1}x {venta.producto}</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                              {venta.metodoPago || 'Efectivo'}
                            </span>
                          </td>
                          <td className="p-3.5 font-serif font-bold text-amber-950 text-sm">
                            {formatCurrency(venta.total)}
                          </td>
                          <td className="p-3.5">
                            {isAnulada ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                Anulada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                Completada
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => setSelectedVentaTicket(venta)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                              title="Ver e imprimir ticket"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setVentaToDelete(venta);
                                setSecurityCode('');
                                setDeleteErrorCode(null);
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              title="Eliminar venta permanentemente de Firebase (requiere código 0000)"
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

      {/* SALES SUMMARY (DÍA, SEMANA, MES) */}
      {activeSubTab === 'resumen' && (
        <ResumenVentasView
          ventas={ventas}
          onVerHistorial={() => setActiveSubTab('historial')}
          onNuevoCobro={() => setActiveSubTab('pos')}
        />
      )}

      {/* Modal Eliminar Venta Individual con Código de Seguridad 0000 */}
      {ventaToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    Eliminar Venta de Firebase
                  </h3>
                  <span className="text-[11px] font-mono text-stone-500">
                    #{ventaToDelete.numeroVenta || ventaToDelete.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setVentaToDelete(null);
                  setSecurityCode('');
                  setDeleteErrorCode(null);
                }}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <div className="flex justify-between font-bold">
                <span>Cliente:</span>
                <span>{ventaToDelete.cliente || 'Cliente Ocasional'}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Venta:</span>
                <span className="font-bold text-amber-950">{formatCurrency(ventaToDelete.total)}</span>
              </div>
              <div className="flex justify-between text-stone-600 text-[11px]">
                <span>Fecha:</span>
                <span>{formatFechaCorta(ventaToDelete.createdAt || ventaToDelete.fecha)}</span>
              </div>
              <div className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/60 mt-1">
                ✓ Se eliminará permanentemente de la base de datos de Firebase.
                <br />
                ✓ El inventario de los productos vendidos se restaurará automáticamente.
              </div>
            </div>

            <form onSubmit={handleConfirmDeleteVenta} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span>Código de Seguridad Requerido</span>
                </label>
                <p className="text-[11px] text-stone-500 mb-2">
                  Para autorizar la eliminación de Firebase, introduce el código de seguridad (<strong>0000</strong>):
                </p>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  required
                  placeholder="0000"
                  value={securityCode}
                  onChange={(e) => {
                    setSecurityCode(e.target.value);
                    setDeleteErrorCode(null);
                  }}
                  className="w-full text-center tracking-[0.5em] font-mono text-lg py-2.5 px-4 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                {deleteErrorCode && (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{deleteErrorCode}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Eliminando de Firebase...' : 'Eliminar Permanentemente'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVentaToDelete(null);
                    setSecurityCode('');
                    setDeleteErrorCode(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vaciar Todo el Historial con Código 0000 */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    Vaciar Historial y Poner Ventas a 0
                  </h3>
                  <span className="text-[11px] text-stone-500">
                    Eliminación completa en Firebase
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsClearAllModalOpen(false);
                  setClearAllSecurityCode('');
                  setClearAllErrorCode(null);
                }}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Esta acción eliminará <strong>todas las {ventas.length} ventas</strong> de la base de datos de Firebase y de tu historial local. El contador de ventas se restablecerá a <strong>$0.00</strong>.
            </p>

            <form onSubmit={handleConfirmClearAllVentas} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span>Código de Seguridad Requerido</span>
                </label>
                <p className="text-[11px] text-stone-500 mb-2">
                  Introduce el código de seguridad (<strong>0000</strong>) para confirmar el vaciado completo:
                </p>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  required
                  placeholder="0000"
                  value={clearAllSecurityCode}
                  onChange={(e) => {
                    setClearAllSecurityCode(e.target.value);
                    setClearAllErrorCode(null);
                  }}
                  className="w-full text-center tracking-[0.5em] font-mono text-lg py-2.5 px-4 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                {clearAllErrorCode && (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{clearAllErrorCode}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Vaciando...' : 'Vaciar y Poner en 0'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsClearAllModalOpen(false);
                    setClearAllSecurityCode('');
                    setClearAllErrorCode(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {selectedVentaTicket && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-800" />
                <h3 className="font-serif font-bold text-stone-900">Comprobante de Venta</h3>
              </div>
              <button
                onClick={() => setSelectedVentaTicket(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 border-b border-dashed border-stone-200">
              <img
                src={config?.logoUrl || '/images/logo.png'}
                alt={config?.nombre || "Logo"}
                className="h-12 w-12 aspect-square mx-auto mb-1.5 object-contain rounded-full"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (target.src.endsWith('/images/logo.png')) {
                    target.src = '/logo.png';
                  } else if (target.src.endsWith('/logo.png')) {
                    target.src = '/logo.jpg';
                  }
                }}
              />
              <h4 className="font-serif font-bold text-stone-900 text-base">{config?.nombre || "Dulzuras de Belgi's"}</h4>
              <p className="text-[11px] text-pink-700 font-semibold italic">{config?.eslogan || 'Repostería para todos tus eventos!!'}</p>
              <p className="text-[10px] text-stone-500">{config?.direccion || 'Calle 2 ave. Bolívar, PH Bahía Limón, Colón'}</p>
              <p className="text-[10px] text-stone-500 font-medium mt-1">
                Cajero: <strong>{selectedVentaTicket.vendedor || activeCajero}</strong>
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">Ticket #{selectedVentaTicket.id?.slice(-8)}</p>
              <p className="text-[10px] text-stone-400">
                {formatFechaCorta(selectedVentaTicket.createdAt || selectedVentaTicket.fecha)}
              </p>
              <p className="text-[9px] text-stone-400 mt-1">
                {config?.marcaRegistradaTexto || 'Marca debidamente registrada en el Registro Público de Panamá'}
              </p>
            </div>

            {/* Ticket Items */}
            <div className="space-y-1.5 text-xs py-2 border-b border-dashed border-stone-200">
              {selectedVentaTicket.items && selectedVentaTicket.items.length > 0 ? (
                selectedVentaTicket.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.cantidad}x {it.nombre}</span>
                    <span className="font-semibold">{formatCurrency(it.subtotal)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span>{selectedVentaTicket.cantidad || 1}x {selectedVentaTicket.producto}</span>
                  <span className="font-semibold">{formatCurrency(selectedVentaTicket.total)}</span>
                </div>
              )}
            </div>

            {/* Total and Payment */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-bold text-stone-900 text-sm">
                <span>Total:</span>
                <span className="font-serif">{formatCurrency(selectedVentaTicket.total)}</span>
              </div>
              <div className="flex justify-between text-stone-500 text-[11px]">
                <span>Método:</span>
                <span>{selectedVentaTicket.metodoPago || 'Efectivo'}</span>
              </div>
              {selectedVentaTicket.montoRecibido !== undefined && selectedVentaTicket.montoRecibido > 0 && (
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Recibido:</span>
                  <span>{formatCurrency(selectedVentaTicket.montoRecibido)}</span>
                </div>
              )}
              {selectedVentaTicket.cambio !== undefined && selectedVentaTicket.cambio > 0 && (
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Cambio:</span>
                  <span>{formatCurrency(selectedVentaTicket.cambio)}</span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                onClick={() => setSelectedVentaTicket(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Shift Switcher Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-pink-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pink-100 text-pink-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    Cambiar Cajero de Jornada
                  </h3>
                  <span className="text-[11px] text-stone-500">
                    Responsable activo de cobros
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Selecciona o escribe el nombre de la persona que continuará la jornada de caja:
            </p>

            {/* Quick Presets from Admin Config */}
            {config?.cajerosPredefinidos && config.cajerosPredefinidos.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {config.cajerosPredefinidos.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setShiftNameInput(name)}
                    className={`p-2 text-left rounded-xl text-xs font-semibold border transition-all cursor-pointer truncate ${
                      shiftNameInput === name
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nombre del Cajero
              </label>
              <input
                type="text"
                value={shiftNameInput}
                onChange={(e) => setShiftNameInput(e.target.value)}
                placeholder="Escribe el nombre del cajero"
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (shiftNameInput.trim()) {
                    setActiveCajero(shiftNameInput.trim());
                    authService.updateCajeroJornada(shiftNameInput.trim());
                    setIsShiftModalOpen(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Cajero</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
