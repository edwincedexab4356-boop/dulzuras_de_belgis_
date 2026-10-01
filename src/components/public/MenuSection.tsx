import React, { useState, useMemo } from 'react';
import { Search, Plus, Check, Sparkles, MessageCircle, Tag, Flame, Gift, ShoppingBag } from 'lucide-react';
import { Producto, CartItem, ConfiguracionNegocio, Promocion } from '../../types';
import { formatCurrency, cleanWhatsAppNumber } from '../../utils/formatters';

interface MenuSectionProps {
  productos: Producto[];
  promociones?: Promocion[];
  loading: boolean;
  cart: CartItem[];
  config?: ConfiguracionNegocio;
  onAddToCart: (producto: Producto) => void;
  onOpenCart?: () => void;
}

const PROMO_CATEGORY_LABEL = '🔥 Promociones & Ofertas';

export const MenuSection: React.FC<MenuSectionProps> = ({
  productos,
  promociones = [],
  loading,
  cart,
  config,
  onAddToCart,
  onOpenCart,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);

  const activePromos = useMemo(() => {
    return promociones.filter((p) => p.activa);
  }, [promociones]);

  // Map of active promotions linked to existing products
  const promosByProductId = useMemo(() => {
    const map = new Map<string, Promocion>();
    activePromos.forEach((p) => {
      if (p.productoId) {
        map.set(p.productoId, p);
      }
    });
    return map;
  }, [activePromos]);

  // Promotions that are standalone combos or general offers (not attached to a specific product)
  const standalonePromos = useMemo(() => {
    return activePromos.filter(
      (p) => !p.productoId || !productos.some((prod) => prod.id === p.productoId)
    );
  }, [activePromos, productos]);

  // Extract unique categories from active products + Add Promociones Tab if any active promos exist
  const categories = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });

    if (activePromos.length > 0) {
      return ['Todas', PROMO_CATEGORY_LABEL, ...Array.from(set)];
    }
    return ['Todas', ...Array.from(set)];
  }, [productos, activePromos]);

  // Filter products by category and search query
  const filteredProductos = useMemo(() => {
    if (selectedCategory === PROMO_CATEGORY_LABEL) {
      // In promotions tab, only show products that have an active promo
      return productos.filter((p) => {
        const hasPromo = Boolean(p.id && promosByProductId.has(p.id));
        const matchSearch =
          p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
        return hasPromo && matchSearch;
      });
    }

    return productos.filter((p) => {
      const matchCategory = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      const matchSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [productos, selectedCategory, searchQuery, promosByProductId]);

  // Filter standalone promos by search
  const filteredStandalonePromos = useMemo(() => {
    if (selectedCategory !== 'Todas' && selectedCategory !== PROMO_CATEGORY_LABEL) {
      return [];
    }

    return standalonePromos.filter((p) => {
      const matchSearch =
        p.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.subtitulo && p.subtitulo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.etiqueta && p.etiqueta.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [standalonePromos, selectedCategory, searchQuery]);

  const handleAdd = (producto: Producto, promoOverride?: Promocion) => {
    if (promoOverride && promoOverride.precioOferta) {
      onAddToCart({
        ...producto,
        precio: promoOverride.precioOferta,
        nombre: `${producto.nombre} (${promoOverride.etiqueta || 'Oferta'})`,
      });
    } else {
      onAddToCart(producto);
    }

    if (producto.id) {
      setAddedAnimationId(producto.id);
      setTimeout(() => setAddedAnimationId(null), 1200);
    }
    setLastAddedName(producto.nombre);
    setTimeout(() => setLastAddedName(null), 4000);
  };

  const handleAddStandalonePromo = (promo: Promocion) => {
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

    if (promo.id) {
      setAddedAnimationId(promo.id);
      setTimeout(() => setAddedAnimationId(null), 1200);
    }
    setLastAddedName(promo.titulo);
    setTimeout(() => setLastAddedName(null), 4000);
  };

  const getQuantityInCart = (prodId?: string) => {
    if (!prodId) return 0;
    const item = cart.find((i) => i.producto.id === prodId);
    return item ? item.cantidad : 0;
  };

  const waNumber = cleanWhatsAppNumber(config?.whatsapp || '50767979141');
  const hasAnyItems = filteredProductos.length > 0 || filteredStandalonePromos.length > 0;

  return (
    <section id="menu" className="py-16 bg-white/70 border-y border-pink-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            <span>Nuestras Creaciones</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900">
            Catálogo & Menú Artesanal
          </h2>
          <p className="mt-2 text-stone-600 text-sm sm:text-base">
            Selecciona tus postres y promociones favoritas, agrégalos a tu pedido y envíanoslo directamente a WhatsApp con un solo clic.
          </p>
        </div>

        {/* Filters & Search */}
        {(productos.length > 0 || activePromos.length > 0) && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            {/* Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat, idx) => {
                const isPromoCat = cat === PROMO_CATEGORY_LABEL;
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={`${cat}-${idx}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? isPromoCat
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/20'
                          : 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-sm'
                        : isPromoCat
                        ? 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 font-extrabold'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <span>{cat}</span>
                    {isPromoCat && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isSelected ? 'bg-amber-300 text-stone-950' : 'bg-pink-600 text-white'
                      }`}>
                        {activePromos.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar postre, promo, cupcakes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Quick Alert when product is added */}
        {lastAddedName && (
          <div className="mb-6 p-3 sm:p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-semibold min-w-0">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                ¡<strong>{lastAddedName}</strong> agregado al pedido!
              </span>
            </div>
            {onOpenCart && (
              <button
                type="button"
                onClick={onOpenCart}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline shrink-0 cursor-pointer"
              >
                Ver Carrito
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !hasAnyItems && (
          <div className="text-center py-16 px-6 rounded-3xl bg-pink-50/40 border border-pink-100 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
              {productos.length === 0 && activePromos.length === 0 ? 'Catálogo en Preparación' : 'No encontramos resultados'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {productos.length === 0 && activePromos.length === 0
                ? 'Estamos preparando nuevas recetas y promociones especiales. Próximamente podrás consultar la carta completa y hacer tus pedidos directamente por WhatsApp.'
                : 'No hay productos ni promociones que coincidan con la búsqueda o categoría seleccionada.'}
            </p>
            {(productos.length > 0 || activePromos.length > 0) && (
              <button
                onClick={() => {
                  setSelectedCategory('Todas');
                  setSearchQuery('');
                }}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-pink-600 text-white hover:bg-pink-700 cursor-pointer"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        )}

        {/* Products & Promotions Grid */}
        {!loading && hasAnyItems && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* 1. Standalone Combos & Special Offers (Displayed directly in catalog) */}
            {filteredStandalonePromos.map((promo) => {
              const inCartQty = getQuantityInCart(promo.id);
              const isAdded = addedAnimationId === promo.id;
              const promoWaUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
                `¡Hola! Quiero pedir la promoción "${promo.titulo}" de su catálogo web.`
              )}`;

              return (
                <div
                  key={`promo-${promo.id}`}
                  className="group rounded-2xl border-2 border-pink-200 hover:border-pink-400 bg-gradient-to-b from-white to-pink-50/30 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between relative"
                >
                  {/* Image container */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-pink-50">
                    {promo.imagen ? (
                      <img
                        src={promo.imagen}
                        alt={promo.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-pink-400">
                        <Gift className="w-10 h-10 mb-1" />
                        <span className="text-[10px] font-bold uppercase">{promo.etiqueta || 'OFERTA'}</span>
                      </div>
                    )}

                    {/* Category pill */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-pink-600 text-white shadow-sm uppercase tracking-wider">
                      Promoción Especial
                    </span>

                    {/* Badge */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-400 text-stone-950 shadow-sm uppercase tracking-wider">
                        {promo.etiqueta || 'OFERTA'}
                      </span>
                      {promo.descuentoPorcentaje ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white shadow-xs">
                          {promo.descuentoPorcentaje}% OFF
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif font-extrabold text-stone-900 text-base group-hover:text-pink-600 transition-colors line-clamp-1">
                        {promo.titulo}
                      </h3>
                      {promo.subtitulo && (
                        <p className="text-xs font-bold text-pink-700 mt-0.5 line-clamp-1">
                          {promo.subtitulo}
                        </p>
                      )}
                      {promo.descripcion && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                          {promo.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Price and Cart Action */}
                    <div className="mt-4 pt-3 border-t border-pink-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-pink-700 block leading-none">
                          Precio Oferta
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          {promo.precioOferta ? (
                            <>
                              <span className="font-serif text-lg font-black text-pink-600">
                                {formatCurrency(promo.precioOferta, config?.moneda)}
                              </span>
                              {promo.precioRegular && promo.precioRegular > promo.precioOferta && (
                                <span className="text-xs text-stone-400 line-through">
                                  {formatCurrency(promo.precioRegular, config?.moneda)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="font-serif text-lg font-black text-pink-600">
                              {promo.precioRegular ? formatCurrency(promo.precioRegular, config?.moneda) : 'Especial'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={promoWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                          title="Pedir por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>

                        {inCartQty > 0 ? (
                          <div className="flex items-center gap-1 bg-pink-100 border border-pink-300 px-2 py-1 rounded-xl">
                            <span className="text-xs font-black text-pink-800">
                              {inCartQty}
                            </span>
                            <button
                              onClick={() => handleAddStandalonePromo(promo)}
                              className="p-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white transition-colors cursor-pointer"
                              title="Agregar una más"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddStandalonePromo(promo)}
                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white'
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
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 2. Regular Products (Highlighted if linked to an active promo) */}
            {filteredProductos.map((prod, idx) => {
              const inCartQty = getQuantityInCart(prod.id);
              const isAdded = addedAnimationId === prod.id;
              const isOutOfStock = prod.disponible === false || (prod.stock !== undefined && prod.stock <= 0);
              const linkedPromo = prod.id ? promosByProductId.get(prod.id) : undefined;

              return (
                <div
                  key={prod.id ? `${prod.id}-${idx}` : `prod-${idx}`}
                  className={`group rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                    linkedPromo
                      ? 'border-2 border-pink-300 hover:border-pink-500'
                      : 'border border-stone-200 hover:border-pink-300'
                  }`}
                >
                  {/* Image container */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-100">
                    <img
                      src={prod.imagen || 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=600&q=80'}
                      alt={prod.nombre}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?auto=format&fit=crop&w=600&q=80';
                      }}
                    />

                    {/* Category pill */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/95 text-stone-800 backdrop-blur-sm shadow-sm border border-stone-100">
                      {prod.categoria}
                    </span>

                    {/* Promo badge if linked */}
                    {linkedPromo ? (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-200" />
                        <span>{linkedPromo.etiqueta || 'OFERTA'}</span>
                        {linkedPromo.descuentoPorcentaje ? (
                          <span className="ml-0.5 text-amber-200">({linkedPromo.descuentoPorcentaje}%)</span>
                        ) : null}
                      </span>
                    ) : isOutOfStock ? (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white shadow-sm">
                        Agotado
                      </span>
                    ) : (
                      prod.stock !== undefined && prod.stock <= 5 && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white shadow-sm">
                          ¡Últimas {prod.stock}!
                        </span>
                      )
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-stone-900 text-base group-hover:text-pink-700 transition-colors line-clamp-1">
                        {prod.nombre}
                      </h3>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                        {linkedPromo?.descripcion || prod.descripcion}
                      </p>
                    </div>

                    {/* Price and Cart Action */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block leading-none">
                          {linkedPromo ? 'Precio Promo' : 'Precio'}
                        </span>

                        {linkedPromo && linkedPromo.precioOferta ? (
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="font-serif text-lg font-black text-pink-600">
                              {formatCurrency(linkedPromo.precioOferta, config?.moneda)}
                            </span>
                            <span className="text-xs text-stone-400 line-through">
                              {formatCurrency(prod.precio, config?.moneda)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-serif text-lg font-extrabold text-stone-900">
                            {formatCurrency(prod.precio, config?.moneda)}
                          </span>
                        )}
                      </div>

                      {inCartQty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 px-2 py-1 rounded-xl">
                          <span className="text-xs font-black text-pink-700">
                            {inCartQty} en pedido
                          </span>
                          <button
                            onClick={() => handleAdd(prod, linkedPromo)}
                            disabled={isOutOfStock}
                            className="p-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white transition-colors cursor-pointer"
                            title="Agregar uno más"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAdd(prod, linkedPromo)}
                          disabled={isOutOfStock}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                            isOutOfStock
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                              : isAdded
                              ? 'bg-emerald-600 text-white'
                              : linkedPromo
                              ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white'
                              : 'bg-pink-600 hover:bg-pink-700 text-white active:scale-95'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>¡Agregado!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>{linkedPromo ? 'Añadir Promo' : 'Agregar'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
