import React from 'react';
import { X, Instagram, MessageCircle, Mail, MapPin, ExternalLink, Sparkles } from 'lucide-react';
import { ConfiguracionNegocio } from '../../types';
import { cleanWhatsAppNumber } from '../../utils/formatters';

interface RedesSocialesModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionNegocio;
}

export const RedesSocialesModal: React.FC<RedesSocialesModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  if (!isOpen) return null;

  const waNumber = cleanWhatsAppNumber(config.whatsapp || '50767979141');
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    config.whatsappMensajeInicial || '¡Hola Dulzuras de Belgi\'s! Me gustaría hacer una consulta o pedido.'
  )}`;

  const redes = [
    {
      name: 'WhatsApp Oficial',
      handle: `+${waNumber}`,
      desc: 'Atención directa, cotizaciones y pedidos inmediatos',
      url: waUrl,
      icon: MessageCircle,
      bg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900',
      iconColor: 'text-emerald-600',
      btnText: 'Escribir por WhatsApp',
    },
    {
      name: 'Instagram',
      handle: '@dulzurasdebelgis',
      desc: 'Fotos de creaciones, eventos, historias y catálogo en vivo',
      url: config.instagram || 'https://www.instagram.com/dulzurasdebelgis/?hl=es-la',
      icon: Instagram,
      bg: 'bg-pink-50 hover:bg-pink-100/80 border-pink-200 text-pink-950',
      iconColor: 'text-pink-600',
      btnText: 'Seguir en Instagram',
    },
    ...(config.tiktok
      ? [
          {
            name: 'TikTok',
            handle: '@dulzurasdebelgis',
            desc: 'Videos de decoración, preparación artesanal y recetas',
            url: config.tiktok,
            icon: Sparkles,
            bg: 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-900',
            iconColor: 'text-stone-800',
            btnText: 'Ver en TikTok',
          },
        ]
      : []),
    ...(config.facebook
      ? [
          {
            name: 'Facebook',
            handle: "Dulzuras de Belgi's",
            desc: 'Comunidad, opiniones de clientes y publicaciones',
            url: config.facebook,
            icon: ExternalLink,
            bg: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-950',
            iconColor: 'text-blue-600',
            btnText: 'Seguir en Facebook',
          },
        ]
      : []),
    {
      name: 'Correo Electrónico',
      handle: config.email || 'dulzurasdebelgis@gmail.com',
      desc: 'Cotizaciones formales para eventos corporativos y bodas',
      url: `mailto:${config.email || 'dulzurasdebelgis@gmail.com'}?subject=Cotización de Repostería - Evento`,
      icon: Mail,
      bg: 'bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-950',
      iconColor: 'text-purple-600',
      btnText: 'Enviar Correo',
    },
    {
      name: 'Ubicación en Google Maps',
      handle: config.direccion || 'Ciudad de Colón, Calle 2 ave. Bolívar',
      desc: 'Encuéntranos en PH Bahía Limón, Colón, Panamá',
      url: config.googleMaps || 'https://maps.app.goo.gl/cpq63XcE3vPFfuRz5',
      icon: MapPin,
      bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-950',
      iconColor: 'text-amber-600',
      btnText: 'Abrir en Google Maps',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center pb-5 border-b border-stone-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Conéctate con Nosotros</span>
          </div>
          <h3 id="social-modal-title" className="font-serif text-2xl font-bold text-stone-900">
            Nuestras Redes Sociales
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xs mx-auto">
            Síguenos, escríbenos o cotiza tu próximo evento dulce con nosotros
          </p>
        </div>

        <div className="space-y-3 pt-5">
          {redes.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all group ${item.bg}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-white shadow-xs shrink-0">
                    <Icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-serif text-sm font-bold text-stone-900 group-hover:text-pink-600 transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-xs font-semibold text-stone-700 truncate">
                      {item.handle}
                    </p>
                    <p className="text-[11px] text-stone-500 line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <div className="p-2 rounded-xl bg-white text-stone-400 group-hover:text-pink-600 shadow-xs group-hover:scale-110 transition-transform">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-400 font-medium">
            {config.marcaRegistradaTexto || 'Marca debidamente registrada en el Registro Público de Panamá'}
          </p>
        </div>
      </div>
    </div>
  );
};
