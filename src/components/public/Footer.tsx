import React from 'react';
import { Lock, MessageCircle, Instagram, MapPin, Mail, ShieldCheck } from 'lucide-react';
import { ConfiguracionNegocio } from '../../types';
import { cleanWhatsAppNumber } from '../../utils/formatters';
import { BelgisLogo } from '../common/BelgisLogo';

interface FooterProps {
  config: ConfiguracionNegocio;
  onGoToAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ config, onGoToAdmin }) => {
  const currentYear = new Date().getFullYear();
  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');
  const footerTapCountRef = React.useRef(0);
  const footerTapTimerRef = React.useRef<any>(null);

  const handleFooterLogoTap = () => {
    footerTapCountRef.current += 1;
    if (footerTapTimerRef.current) {
      clearTimeout(footerTapTimerRef.current);
    }
    if (footerTapCountRef.current >= 3) {
      footerTapCountRef.current = 0;
      onGoToAdmin();
      return;
    }
    footerTapTimerRef.current = setTimeout(() => {
      footerTapCountRef.current = 0;
    }, 450);
  };

  return (
    <footer className="bg-stone-900 text-stone-300 py-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
          
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <div
              onClick={handleFooterLogoTap}
              className="flex items-center gap-3 cursor-pointer group select-none active:scale-95 transition-transform inline-flex"
              title="Dulzuras de Belgi's (Toca 3 veces para entrar al modo Admin)"
            >
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.nombre || "Dulzuras de Belgi's"}
                  className="h-12 w-12 aspect-square rounded-full object-contain drop-shadow-sm"
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
                <BelgisLogo size={48} showDetails={false} />
              )}
              <div>
                <span className="font-serif text-2xl font-bold text-white tracking-tight block">
                  {config.nombre || "Dulzuras de Belgi's"}
                </span>
                <span className="text-xs font-semibold text-pink-400 italic block">
                  {config.eslogan || 'Repostería para todos tus eventos!!'}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              {config.descripcion ||
                'Dulcería y repostería artesanal en Panamá. Confeccionamos postres, dulces y creaciones personalizadas con los mejores ingredientes para hacer inolvidable cada celebración.'}
            </p>

            {/* Official registration badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{config.marcaRegistradaTexto || 'Marca debidamente registrada en el Registro Público de Panamá'}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-400 pt-1">
              <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span>{config.direccion || 'Ciudad de Colón, Calle 2 ave. Bolívar, PH Bahía Limón'}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Navegación
            </h4>
            <ul className="space-y-1.5 text-xs text-stone-400">
              <li><a href="#inicio" className="hover:text-pink-400 transition-colors">Inicio</a></li>
              <li><a href="#menu" className="hover:text-pink-400 transition-colors">Menú de Productos</a></li>
              <li><a href="#nosotros" className="hover:text-pink-400 transition-colors">Sobre Nosotros</a></li>
              <li><a href="#ubicacion" className="hover:text-pink-400 transition-colors">Horarios y Ubicación</a></li>
            </ul>
          </div>

          {/* Business Contact & Social */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Pedidos & Redes
            </h4>
            <p className="text-xs text-stone-400">
              WhatsApp Oficial: <br />
              <span className="font-semibold text-emerald-400">+{waNumber}</span>
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chatear por WhatsApp</span>
              </a>
              {config.instagram && (
                <a
                  href={config.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 font-semibold"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Instagram @dulzurasdebelgis</span>
                </a>
              )}
              {config.email && (
                <a
                  href={`mailto:${config.email}`}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-300 hover:text-white font-semibold"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{config.email}</span>
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-1">
            <span>© {currentYear} {config.nombre || "Dulzuras de Belgi's"}. Todos los derechos reservados.</span>
            {/* Secret discreet entrance dot - almost imperceptible */}
            <button
              onClick={onGoToAdmin}
              className="text-stone-700 hover:text-stone-400 transition-colors p-1 cursor-default text-[10px] select-none opacity-40 hover:opacity-100"
              title=""
              aria-label="Acceso privado"
            >
              ·
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
