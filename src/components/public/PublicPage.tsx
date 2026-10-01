import React, { useState } from 'react';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { MenuSection } from './MenuSection';
import { BusinessInfoSection } from './BusinessInfoSection';
import { LocationHoursSection } from './LocationHoursSection';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { RedesSocialesModal } from './RedesSocialesModal';
import { Producto, CartItem, ConfiguracionNegocio, Promocion } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { PromocionesSection } from './PromocionesSection';
import { PromocionesFloatingModal } from './PromocionesFloatingModal';

interface PublicPageProps {
  productos: Producto[];
  promociones: Promocion[];
  loadingProductos: boolean;
  config: ConfiguracionNegocio;
  cart: CartItem[];
  onAddToCart: (producto: Producto) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onGoToAdmin: () => void;
}

export const PublicPage: React.FC<PublicPageProps> = ({
  productos,
  promociones,
  loadingProductos,
  config,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveFromCart,
  onClearCart,
  onGoToAdmin,
}) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const totalCartCount = cart.reduce((acc, item) => acc + item.cantidad, 0);
  const totalCartAmount = cart.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0);

  // Discreet keyboard shortcut: Ctrl+Shift+A or Cmd+Shift+A to open staff login
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        onGoToAdmin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onGoToAdmin]);

  const handleNavigate = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf6f8] text-stone-800">
      <Navbar
        config={config}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onGoToAdmin={onGoToAdmin}
        onNavigate={handleNavigate}
      />

      <main className="flex-1 pb-16">
        <HeroSection
          config={config}
          onExploreMenu={() => handleNavigate('menu')}
          onOpenRedesSociales={() => setIsSocialModalOpen(true)}
        />

        {/* Promociones & Ofertas Especiales */}
        <PromocionesSection
          promociones={promociones}
          productos={productos}
          config={config}
          onAddToCart={onAddToCart}
          onExploreMenu={() => handleNavigate('menu')}
        />

        <MenuSection
          productos={productos}
          loading={loadingProductos}
          cart={cart}
          config={config}
          onAddToCart={onAddToCart}
          onOpenCart={() => setIsCartOpen(true)}
        />

        <BusinessInfoSection config={config} />
        <LocationHoursSection config={config} />
      </main>

      <Footer config={config} onGoToAdmin={onGoToAdmin} />

      {/* Floating Welcome & Action Modal for Promos */}
      <PromocionesFloatingModal
        promociones={promociones}
        productos={productos}
        config={config}
        onAddToCart={onAddToCart}
        onNavigateToMenu={() => handleNavigate('menu')}
      />

      {/* Social Networks Modal */}
      <RedesSocialesModal
        isOpen={isSocialModalOpen}
        onClose={() => setIsSocialModalOpen(false)}
        config={config}
      />

      {/* Floating Sticky Bar: Pedir por WhatsApp when cart has items */}
      {totalCartCount > 0 && !isCartOpen && (
        <aside
          aria-label="Resumen de pedido y envío por WhatsApp"
          className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto"
        >
          <div className="bg-stone-900/95 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-stone-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity flex-1 min-w-0 cursor-pointer"
            >
              <div className="relative p-2 rounded-xl bg-pink-500/20 text-pink-400 shrink-0">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-pink-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                  {totalCartCount}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-stone-300 font-medium truncate">
                  {totalCartCount} {totalCartCount === 1 ? 'producto listo' : 'productos listos'}
                </p>
                <p className="text-sm font-serif font-extrabold text-white">
                  Total: {formatCurrency(totalCartAmount, config.moneda || 'USD')}
                </p>
              </div>
            </button>

            <button
              id="floating-whatsapp-order-btn"
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Pedir por WhatsApp</span>
            </button>
          </div>
        </aside>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        config={config}
        onUpdateQuantity={onUpdateCartQuantity}
        onRemoveItem={onRemoveFromCart}
        onClearCart={onClearCart}
      />
    </div>
  );
};
