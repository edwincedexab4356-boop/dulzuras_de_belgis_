import React from 'react';
import { ShoppingBag, Lock, MessageCircle, Menu, X } from 'lucide-react';
import { ConfiguracionNegocio } from '../../types';
import { cleanWhatsAppNumber } from '../../utils/formatters';
import { BelgisLogo } from '../common/BelgisLogo';

interface NavbarProps {
  config: ConfiguracionNegocio;
  cartCount: number;
  onOpenCart: () => void;
  onGoToAdmin: () => void;
  onNavigate: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  cartCount,
  onOpenCart,
  onGoToAdmin,
  onNavigate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavClick = (sectionId: string) => {
    onNavigate(sectionId);
    setMobileMenuOpen(false);
  };

  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');
  const quickWaUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    '¡Hola Dulzuras de Belgi\'s! Quisiera consultar sobre los postres para mi evento.'
  )}`;

  return (
    <header className="sticky top-0 z-40 bg-[#faf6f8]/95 backdrop-blur-md border-b border-pink-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div
            onClick={() => handleNavClick('inicio')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.nombre || "Dulzuras de Belgi's"}
                className="h-12 sm:h-14 w-12 sm:w-14 aspect-square rounded-full object-contain group-hover:scale-105 transition-transform drop-shadow-sm"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.src.endsWith('/images/logo.png')) {
                    target.src = '/images/logo.png';
                  } else {
                    target.src = '/logo.png';
                  }
                }}
              />
            ) : (
              <BelgisLogo size={48} className="group-hover:scale-105 transition-transform" showDetails={false} />
            )}
            <div>
              <span className="font-serif text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 block leading-tight">
                {config.nombre || "Dulzuras de Belgi's"}
              </span>
              <span className="text-[11px] font-semibold text-pink-700 block italic">
                {config.eslogan || 'Repostería para todos tus eventos!!'}
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-700">
            <button
              onClick={() => handleNavClick('inicio')}
              className="hover:text-pink-600 transition-colors py-1 cursor-pointer"
            >
              Inicio
            </button>
            <button
              onClick={() => handleNavClick('promociones')}
              className="hover:text-pink-600 text-pink-700 font-bold transition-colors py-1 cursor-pointer flex items-center gap-1"
            >
              <span>🔥 Promociones</span>
            </button>
            <button
              onClick={() => handleNavClick('menu')}
              className="hover:text-pink-600 transition-colors py-1 cursor-pointer"
            >
              Menú & Categorías
            </button>
            <button
              onClick={() => handleNavClick('nosotros')}
              className="hover:text-pink-600 transition-colors py-1 cursor-pointer"
            >
              Sobre Nosotros
            </button>
            <button
              onClick={() => handleNavClick('ubicacion')}
              className="hover:text-pink-600 transition-colors py-1 cursor-pointer"
            >
              Ubicación y Horarios
            </button>
          </nav>

          {/* Actions: WhatsApp, Cart, Admin */}
          <div className="flex items-center gap-3">
            {/* Quick WhatsApp chat button */}
            <a
              href={quickWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
              title="Chatear por WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            {/* Cart Button */}
            <button
              id="cart-trigger-btn"
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white transition-all flex items-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer"
              aria-label="Abrir carrito de compras"
            >
              <ShoppingBag className="w-5 h-5 text-pink-100" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
                Carrito
              </span>
              {cartCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-extrabold bg-lime-400 text-stone-950 rounded-full shadow-xs animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl text-stone-700 hover:bg-pink-100/60 transition-colors cursor-pointer"
              aria-label="Alternar menú móvil"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-pink-100 space-y-2 animate-in slide-in-from-top duration-200">
            <button
              onClick={() => handleNavClick('inicio')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-pink-50 rounded-xl"
            >
              Inicio
            </button>
            <button
              onClick={() => handleNavClick('promociones')}
              className="block w-full text-left px-3 py-2 text-sm font-bold text-pink-700 bg-pink-50/50 hover:bg-pink-50 rounded-xl"
            >
              🔥 Promociones & Ofertas
            </button>
            <button
              onClick={() => handleNavClick('menu')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-pink-50 rounded-xl"
            >
              Menú & Categorías
            </button>
            <button
              onClick={() => handleNavClick('nosotros')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-pink-50 rounded-xl"
            >
              Sobre Nosotros
            </button>
            <button
              onClick={() => handleNavClick('ubicacion')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-pink-50 rounded-xl"
            >
              Ubicación y Horarios
            </button>
            <div className="pt-2 border-t border-pink-100">
              <a
                href={quickWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-xl"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Escribir por WhatsApp</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
