import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ShoppingBag,
  MessageCircle,
  Tag,
  ArrowRight,
  Flame,
  Gift,
  Check,
} from 'lucide-react';
import { Promocion, Producto, ConfiguracionNegocio } from '../../types';
import { formatCurrency, cleanWhatsAppNumber } from '../../utils/formatters';

interface PromocionesFloatingModalProps {
  promociones: Promocion[];
  productos: Producto[];
  config: ConfiguracionNegocio;
  onAddToCart: (producto: Producto) => void;
  onNavigateToMenu?: () => void;
}

export const PromocionesFloatingModal: React.FC<PromocionesFloatingModalProps> = ({
  promociones,
  productos,
  config,
  onAddToCart,
  onNavigateToMenu,
}) => {
  const activePromos = promociones.filter((p) => p.activa);
  const modalPromos = activePromos.filter((p) => p.mostrarModalInicio);

  const [isOpen, setIsOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Show floating modal automatically when customer enters (once per session)
  useEffect(() => {
    if (modalPromos.length === 0) return;

    try {
      const alreadyShown = sessionStorage.getItem('delicias_promo_modal_seen');
      if (!alreadyShown) {
        // Small delay so page renders nicely first
        const timer = setTimeout(() => {
          setIsOpen(true);
          sessionStorage.setItem('delicias_promo_modal_seen', 'true');
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Fallback
    }
  }, [modalPromos.length]);

  if (activePromos.length === 0) {
    return null;
  }

  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');

  const handleAddPromoToCart = (promo: Promocion) => {
    // If promo is linked to an existing product
    if (promo.productoId) {
      const existingProd = productos.find((p) => p.id === promo.productoId);
      if (existingProd) {
        onAddToCart({
          ...existingProd,
          precio: promo.precioOferta || existingProd.precio,
          nombre: `${existingProd.nombre} (${promo.etiqueta || 'Promo'})`,
        });
      }
    } else {
      // Custom promo item
      const customProd: Producto = {
        id: promo.id,
        nombre: promo.titulo,
        descripcion: promo.descripcion || promo.subtitulo || 'Promoción especial',
        precio: promo.precioOferta || promo.precioRegular || 0,
        categoria: 'Promociones',
        imagen: promo.imagen || '',
        disponible: true,
      };
      onAddToCart(customProd);
    }

    if (promo.id) {
      setAddedIds((prev) => new Set(prev).add(promo.id!));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(promo.id!);
          return next;
        });
      }, 2500);
    }
  };

  return (
    <>
      {/* 1. FLOATING ACTION BADGE BUTTON (Bottom Left) */}
      <div className="fixed bottom-5 left-5 z-40 animate-bounce duration-1000">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 text-white font-extrabold text-xs shadow-lg shadow-pink-600/35 hover:scale-105 transition-all cursor-pointer border-2 border-white"
          title="Ver Promociones y Ofertas Especiales"
          aria-label="Ver Promociones y Ofertas Especiales"
        >
          <Gift className="w-4 h-4 text-amber-200 animate-spin duration-3000" />
          <span className="tracking-wide">
            Promociones ({activePromos.length})
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
          </span>
        </button>
      </div>

      {/* 2. FLOATING PROMOTIONS MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border-2 border-pink-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            
            {/* Header with Celebration Banner */}
            <div className="relative p-5 sm:p-6 bg-gradient-to-br from-pink-600 via-rose-600 to-pink-700 text-white text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
                aria-label="Cerrar promociones"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-amber-200 text-xs font-extrabold mb-2 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ofertas Especiales del Día</span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight">
                ¡Endulza tu día con nuestras Promos!
              </h2>
              <p className="text-xs text-pink-100 max-w-md mx-auto mt-1 font-medium">
                Aprovecha nuestros combos y descuentos exclusivos preparados para ti.
              </p>
            </div>

            {/* Promotions List */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-[#faf7f5]">
              {activePromos.map((promo) => {
                const isAdded = promo.id ? addedIds.has(promo.id) : false;
                const quickWaUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
                  `¡Hola! Quiero aprovechar la promoción: "${promo.titulo}" que vi en la página.`
                )}`;

                return (
                  <div
                    key={promo.id}
                    className="p-4 rounded-2xl bg-white border border-pink-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 items-center"
                  >
                    {/* Image */}
                    {promo.imagen ? (
                      <div className="relative w-full sm:w-28 h-32 sm:h-28 rounded-xl overflow-hidden shrink-0">
                        <img
                          src={promo.imagen}
                          alt={promo.titulo}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-pink-600 text-white text-[10px] font-extrabold tracking-wider shadow-xs">
                          {promo.etiqueta || 'OFERTA'}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full sm:w-28 h-24 sm:h-28 rounded-xl bg-pink-50 text-pink-500 flex flex-col items-center justify-center shrink-0 border border-pink-100">
                        <Flame className="w-8 h-8 mb-1" />
                        <span className="text-[10px] font-bold uppercase">{promo.etiqueta || 'OFERTA'}</span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 w-full text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-between gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 text-[10px] font-bold border border-pink-200">
                          {promo.etiqueta || 'ESPECIAL'}
                        </span>
                        {promo.descuentoPorcentaje ? (
                          <span className="text-[11px] font-extrabold text-emerald-600">
                            {promo.descuentoPorcentaje}% OFF
                          </span>
                        ) : null}
                      </div>

                      <h3 className="font-serif font-bold text-base text-stone-900 leading-snug">
                        {promo.titulo}
                      </h3>

                      {promo.subtitulo && (
                        <p className="text-xs font-semibold text-pink-700 mt-0.5">
                          {promo.subtitulo}
                        </p>
                      )}

                      {promo.descripcion && (
                        <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                          {promo.descripcion}
                        </p>
                      )}

                      {/* Prices & Action buttons */}
                      <div className="mt-3 flex items-center justify-between gap-3 pt-2 border-t border-stone-100 flex-wrap">
                        <div className="flex items-baseline gap-2">
                          {promo.precioOferta ? (
                            <>
                              <span className="text-lg font-extrabold text-pink-600">
                                {formatCurrency(promo.precioOferta)}
                              </span>
                              {promo.precioRegular && promo.precioRegular > promo.precioOferta && (
                                <span className="text-xs text-stone-400 line-through">
                                  {formatCurrency(promo.precioRegular)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs font-bold text-pink-600">¡Consúltanos!</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={quickWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                            title="Pedir promo por WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleAddPromoToCart(promo)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-pink-600 hover:bg-pink-700 text-white shadow-xs'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>¡Añadido!</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>Añadir Promo</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between text-xs">
              <span className="text-stone-400 text-[11px]">
                {config.nombre || "Dulzuras de Belgi's"} · Repostería Fina
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToMenu?.();
                }}
                className="font-bold text-pink-700 hover:text-pink-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Menú Completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
