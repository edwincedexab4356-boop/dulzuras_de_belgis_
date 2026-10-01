import React from 'react';
import {
  ArrowRight,
  Sparkles,
  MessageCircle,
  Heart,
  Star,
  Award,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { ConfiguracionNegocio } from '../../types';
import { cleanWhatsAppNumber } from '../../utils/formatters';
import { BelgisLogo } from '../common/BelgisLogo';

interface HeroSectionProps {
  config: ConfiguracionNegocio;
  onExploreMenu: () => void;
  onOpenRedesSociales: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  config,
  onExploreMenu,
  onOpenRedesSociales,
}) => {
  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');
  const directWaUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    config.whatsappMensajeInicial ||
      '¡Hola Dulzuras de Belgi\'s! Me gustaría conocer los postres y dulcería disponibles para mi evento.'
  )}`;

  const heroImg =
    config.heroImagen ||
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=85';

  const brandName = config.nombre || "Dulzuras de Belgi's";
  const slogan = config.eslogan || 'Repostería para todos tus eventos!!';
  const brandDescription =
    config.descripcion ||
    'Dulcería y repostería artesanal en Panamá. Confeccionamos postres, pasteles temáticos, cupcakes y bocaditos personalizados con los mejores ingredientes para hacer inolvidable cada celebración.';
  const marcaRegistrada =
    config.marcaRegistradaTexto ||
    'Marca debidamente registrada en el Registro Público de Panamá';

  return (
    <section id="inicio" className="relative overflow-hidden py-10 lg:py-16">
      {/* Delicate background ambient glows inspired by fuchsia & lime logo */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4 w-96 h-96 bg-pink-200/45 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-80 h-80 bg-lime-200/35 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Text Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Logo Badge & Slogan */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={brandName}
                  className="h-20 w-20 sm:h-24 sm:w-24 aspect-square rounded-full object-contain drop-shadow-md"
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
                <BelgisLogo size={88} className="shadow-lg" showDetails={false} />
              )}
              
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100/90 border border-pink-300/70 text-pink-900 text-xs font-bold tracking-wide mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                  <span>Alta Repostería & Dulcería</span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                  {brandName}
                </h2>
                <p className="text-sm font-semibold text-pink-700 italic">
                  &ldquo;{slogan}&rdquo;
                </p>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 tracking-tight leading-[1.15]">
              {config.heroTitulo || 'El sabor dulce y artesanal para todas tus celebraciones'}
            </h1>

            {/* Brand Description */}
            <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {brandDescription}
            </p>

            {/* Official Registration Notice */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100/90 border border-stone-200/80 text-stone-700 text-xs font-semibold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{marcaRegistrada}</span>
            </div>

            {/* Service Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1 text-xs">
              {config.paraLlevar && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-900 font-semibold">
                  <ShoppingBag className="w-3.5 h-3.5 text-pink-600" />
                  <span>Pedidos Para Llevar</span>
                </span>
              )}
              {config.aDomicilio && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-50 border border-lime-300 text-lime-950 font-semibold">
                  <Truck className="w-3.5 h-3.5 text-lime-700" />
                  <span>Entrega y Envíos a Domicilio</span>
                </span>
              )}
            </div>

            {/* THE THREE REQUESTED ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-3">
              {/* 1. Explorar Menú */}
              <button
                id="hero-explore-menu-btn"
                onClick={onExploreMenu}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-bold text-sm shadow-md shadow-pink-600/25 transition-all cursor-pointer group"
              >
                <span>Explorar Menú</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 2. Pedir por WhatsApp */}
              <a
                id="hero-whatsapp-order-btn"
                href={directWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-all shadow-md shadow-emerald-700/15 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Pedir por WhatsApp</span>
              </a>

              {/* 3. Nuestras Redes Sociales */}
              <button
                id="hero-social-networks-btn"
                onClick={onOpenRedesSociales}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm transition-all shadow-md shadow-stone-900/10 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-pink-400" />
                <span>Nuestras Redes Sociales</span>
              </button>
            </div>

            {/* Quality Badges */}
            <div className="pt-6 border-t border-stone-200/80 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-stone-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-100 text-pink-800">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">100% Artesanal</div>
                  <div className="text-[11px] text-stone-500">Recetas selectas</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-lime-100 text-lime-800">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Ingredientes Top</div>
                  <div className="text-[11px] text-stone-500">Calidad garantizada</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-pink-100 text-pink-800">
                  <Star className="w-4 h-4 text-pink-600 fill-pink-500" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Atención Directa</div>
                  <div className="text-[11px] text-stone-500">Vía WhatsApp</div>
                </div>
              </div>
            </div>

          </div>

          {/* Visual Showcase Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-stone-100">
                <img
                  src={heroImg}
                  alt={`Postres y repostería artesanal ${brandName}`}
                  className="w-full h-80 sm:h-96 object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                
                {/* Floating overlay badge */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-pink-700 block">
                        Repostería Fina & Creativa
                      </span>
                      <h4 className="font-serif text-base font-bold text-stone-900">
                        {brandName}
                      </h4>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-lime-400 text-stone-950 shadow-xs">
                      Eventos & Fiestas
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
