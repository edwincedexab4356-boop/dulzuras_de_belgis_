import React, { useState } from 'react';
import {
  Sparkles,
  Tag,
  ShoppingBag,
  MessageCircle,
  Check,
  Flame,
  ArrowRight,
  Gift,
} from 'lucide-react';
import { Promocion, Producto, ConfiguracionNegocio } from '../../types';
import { formatCurrency, cleanWhatsAppNumber } from '../../utils/formatters';

interface PromocionesSectionProps {
  promociones: Promocion[];
  productos: Producto[];
  config: ConfiguracionNegocio;
  onAddToCart: (producto: Producto) => void;
  onExploreMenu: () => void;
}

export const PromocionesSection: React.FC<PromocionesSectionProps> = ({
  promociones,
  productos,
  config,
  onAddToCart,
  onExploreMenu,
}) => {
  const activePromos = promociones.filter((p) => p.activa);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  if (activePromos.length === 0) {
    return null;
  }

  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');

  const handleAddPromoToCart = (promo: Promocion) => {
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
    <section id="promociones" className="py-12 bg-gradient-to-b from-[#faf6f8] to-[#fbf8f5] relative overflow-hidden border-y border-pink-100/70">
      {/* Background soft ambient glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/3 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 w-80 h-80 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-extrabold uppercase tracking-wider mb-3 shadow-xs">
            <Flame className="w-3.5 h-3.5 text-amber-200" />
            <span>Ofertas & Promociones de Temporada</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Combos y Descuentos Especiales
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 font-medium">
            Aprovecha nuestros precios exclusivos por tiempo limitado en repostería artesanal para todos tus momentos dulces.
          </p>
        </div>

        {/* Promotions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePromos.map((promo) => {
            const isAdded = promo.id ? addedIds.has(promo.id) : false;
            const promoWaUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
              `¡Hola! Deseo pedir la promoción "${promo.titulo}" de su catálogo web.`
            )}`;

            return (
              <div
                key={promo.id}
                className="group bg-white rounded-3xl border-2 border-pink-100 hover:border-pink-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Image and Badges */}
                <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-pink-50">
                  {promo.imagen ? (
                    <img
                      src={promo.imagen}
                      alt={promo.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-pink-400">
                      <Gift className="w-12 h-12 mb-2" />
                      <span className="text-xs font-bold uppercase">{promo.etiqueta || 'OFERTA'}</span>
                    </div>
                  )}

                  {/* Badge floating */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                    <span className="px-3 py-1 rounded-xl bg-pink-600 text-white text-xs font-black uppercase tracking-wider shadow-md">
                      {promo.etiqueta || 'OFERTA'}
                    </span>
                    {promo.descuentoPorcentaje ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-stone-950 text-[10px] font-black uppercase tracking-wider shadow-xs">
                        {promo.descuentoPorcentaje}% OFF
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif font-extrabold text-lg text-stone-900 group-hover:text-pink-600 transition-colors">
                      {promo.titulo}
                    </h3>

                    {promo.subtitulo && (
                      <p className="text-xs font-bold text-pink-700 mt-0.5">
                        {promo.subtitulo}
                      </p>
                    )}

                    {promo.descripcion && (
                      <p className="text-xs text-stone-600 mt-2 line-clamp-3 leading-relaxed">
                        {promo.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Price & Action */}
                  <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                        Precio Promo
                      </span>
                      <div className="flex items-baseline gap-2">
                        {promo.precioOferta ? (
                          <>
                            <span className="text-xl font-black text-pink-600">
                              {formatCurrency(promo.precioOferta)}
                            </span>
                            {promo.precioRegular && promo.precioRegular > promo.precioOferta && (
                              <span className="text-xs text-stone-400 line-through">
                                {formatCurrency(promo.precioRegular)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm font-extrabold text-pink-600">¡Especial!</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={promoWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                        title="Pedir por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleAddPromoToCart(promo)}
                        className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>¡Listo!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Añadir</span>
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

        {/* Bottom Menu Link */}
        <div className="text-center mt-10">
          <button
            type="button"
            onClick={onExploreMenu}
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-pink-600 transition-colors cursor-pointer group"
          >
            <span>Explorar todo nuestro menú regular de postres y pasteles</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};
