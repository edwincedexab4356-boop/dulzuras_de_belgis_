import { Producto, ConfiguracionNegocio, InventarioItem, Venta, Gasto, ProduccionRegistro } from '../types';

export const INITIAL_CONFIGURACION: ConfiguracionNegocio = {
  nombre: "Dulzuras de Belgi's",
  eslogan: 'Repostería para todos tus eventos!!',
  descripcion: 'Dulcería y repostería artesanal en Panamá. Confeccionamos postres, dulces y creaciones personalizadas con los mejores ingredientes para hacer inolvidable cada celebración.',
  marcaRegistradaTexto: 'Marca debidamente registrada en el Registro Público de Panamá',
  telefono: '6797-9141',
  direccion: 'Ciudad de Colón, Calle 2 ave. Bolívar, PH Bahía Limón',
  whatsapp: '50767979141',
  email: 'dulzurasdebelgis@gmail.com',
  moneda: 'USD',
  instagram: 'https://www.instagram.com/dulzurasdebelgis/?hl=es-la',
  facebook: 'https://www.facebook.com/dulzurasdebelgis',
  tiktok: 'https://www.tiktok.com/@dulzurasdebelgis',
  googleMaps: 'https://maps.app.goo.gl/cpq63XcE3vPFfuRz5',
  correoGenericoCajero: 'caja@dulzurasdebelgis.com',
  cajerosPredefinidos: [],
  permitirAdminRegistrarProductos: true,
  permitirAdminCompras: false,
  paraLlevar: true,
  aDomicilio: true,
  horarios: {
    lunes: { activo: true, apertura: '09:00', cierre: '19:30' },
    martes: { activo: true, apertura: '09:00', cierre: '19:30' },
    miercoles: { activo: true, apertura: '09:00', cierre: '19:30' },
    jueves: { activo: true, apertura: '09:00', cierre: '19:30' },
    viernes: { activo: true, apertura: '09:00', cierre: '19:30' },
    sabado: { activo: true, apertura: '09:00', cierre: '19:30' },
    domingo: { activo: false, apertura: '09:00', cierre: '19:30' },
  },
  logoUrl: '/images/logo.png',
  heroImagen: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=85',
  heroTitulo: 'El sabor artesanal que alegra tus mejores momentos',
  heroSubtitulo: 'En Dulzuras de Belgi\'s nos dedicamos a la alta repostería artesanal y dulcería fina, confeccionando creaciones selectas con ingredientes de primera calidad para todos tus eventos.',
  presentacionTexto: 'Somos una dulcería y repostería artesanal en Panamá. Elaboramos postres con recetas únicas, ingredientes frescos y entrega rápida.',
  contactoTexto: 'Visítanos en PH Bahía Limón o solicita tus postres favoritos para llevar y con entrega a domicilio.',
  whatsappMensajeInicial: '¡Hola Dulzuras de Belgi\'s! Me gustaría hacer una consulta sobre repostería para un evento:',
  actualizadoEn: new Date().toISOString(),
};

export const DEFAULT_CONFIGURACION = INITIAL_CONFIGURACION;

export const INITIAL_PRODUCTOS: Producto[] = [];

export const INITIAL_INVENTARIO: InventarioItem[] = [];

export const INITIAL_VENTAS: Venta[] = [];


export const INITIAL_GASTOS: Gasto[] = [];
export const INITIAL_PRODUCCION: ProduccionRegistro[] = [];

export function seedInitialData() {
  try {
    localStorage.removeItem('delicias_belgi_productos');
    localStorage.removeItem('delicias_belgi_ventas');
    localStorage.removeItem('delicias_belgi_produccion');
    localStorage.removeItem('delicias_belgi_inventario');
    localStorage.removeItem('delicias_belgi_config');
    localStorage.removeItem('delicias_belgi_configuracion');
    localStorage.removeItem('delicias_belgi_usuarios');
    localStorage.removeItem('delicias_belgi_deleted_ventas');
  } catch (e) {
    console.warn('Error clearing LocalStorage for seed:', e);
  }
}
