import React, { useState, useMemo } from 'react';
import { Search, Plus, Check, Sparkles, MessageCircle, Tag } from 'lucide-react';
import { Producto, CartItem, ConfiguracionNegocio } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface MenuSectionProps {
  productos: Producto[];
  loading: boolean;
  cart: CartItem[];
  config?: ConfiguracionNegocio;
  onAddToCart: (producto: Producto) => void;
  onOpenCart?: () => void;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  productos,
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

  // Extract unique categories from active products
  const categories = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return ['Todas', ...Array.from(set)];
  }, [productos]);

  // Filter products by category and search query
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchCategory = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      const matchSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [productos, selectedCategory, searchQuery]);

  const handleAdd = (producto: Producto) => {
    onAddToCart(producto);
    if (producto.id) {
      setAddedAnimationId(producto.id);
      setTimeout(() => setAddedAnimationId(null), 1200);
    }
    setLastAddedName(producto.nombre);
    setTimeout(() => setLastAddedName(null), 4000);
  };

  const getQuantityInCart = (prodId?: string) => {
    if (!prodId) return 0;
    const item = cart.find((i) => i.producto.id === prodId);
    return item ? item.cantidad : 0;
  };

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
            Menú Artesanal
          </h2>
          <p className="mt-2 text-stone-600 text-sm sm:text-base">
            Selecciona tus postres favoritos, agrégalos a tu pedido y envíanoslo directamente a WhatsApp con un solo clic.
          </p>
        </div>

        {/* Filters & Search - only when products exist */}
        {productos.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            {/* Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat, idx) => (
                <button
                  key={`${cat}-${idx}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar postre, dulce, cupcakes..."
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
            <button
              onClick={() => onOpenCart?.()}
              className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white" />
              <span>Pedir por WhatsApp</span>
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="rounded-2xl border border-stone-200 bg-white p-4 animate-pulse space-y-3">
                <div className="w-full h-48 bg-stone-200 rounded-xl" />
                <div className="h-4 bg-stone-200 rounded w-2/3" />
                <div className="h-3 bg-stone-100 rounded w-full" />
                <div className="h-3 bg-stone-100 rounded w-4/5" />
                <div className="h-8 bg-stone-200 rounded-xl pt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProductos.length === 0 && (
          <div className="text-center py-16 px-6 rounded-3xl bg-pink-50/40 border border-pink-100 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
              {productos.length === 0 ? 'Menú en Preparación' : 'No encontramos productos'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {productos.length === 0
                ? 'Estamos preparando nuevas recetas y postres artesanales. Próximamente podrás consultar la carta completa y hacer tus pedidos directamente por WhatsApp.'
                : 'No hay productos que coincidan con la búsqueda o categoría seleccionada.'}
            </p>
            {productos.length > 0 && (
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

        {/* Products Grid */}
        {!loading && filteredProductos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProductos.map((prod, idx) => {
              const inCartQty = getQuantityInCart(prod.id);
              const isAdded = addedAnimationId === prod.id;
              const isOutOfStock = prod.disponible === false || (prod.stock !== undefined && prod.stock <= 0);

              return (
                <div
                  key={prod.id ? `${prod.id}-${idx}` : `prod-${idx}`}
                  className="group rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-pink-300 transition-all flex flex-col justify-between"
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

                    {/* Stock badge */}
                    {isOutOfStock ? (
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
                        {prod.descripcion}
                      </p>
                    </div>

                    {/* Price and Cart Action */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block leading-none">
                          Precio
                        </span>
                        <span className="font-serif text-lg font-extrabold text-stone-900">
                          {formatCurrency(prod.precio)}
                        </span>
                      </div>

                      {inCartQty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 px-2 py-1 rounded-xl">
                          <span className="text-xs font-black text-pink-700">
                            {inCartQty} en pedido
                          </span>
                          <button
                            onClick={() => handleAdd(prod)}
                            disabled={isOutOfStock}
                            className="p-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white transition-colors cursor-pointer"
                            title="Agregar uno más"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAdd(prod)}
                          disabled={isOutOfStock}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                            isOutOfStock
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                              : isAdded
                              ? 'bg-emerald-600 text-white'
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
                              <span>Agregar</span>
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
