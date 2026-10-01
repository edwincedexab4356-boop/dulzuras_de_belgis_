import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BadgeDollarSign,
  Package,
  Boxes,
  Factory,
  FolderTree,
  Shield,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Cake,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Clock,
  Tag,
} from 'lucide-react';
import { UserAuth, AdminTab, ConfiguracionNegocio } from '../../types';
import { isSupabaseConfigured } from '../../services/supabase';
import { normalizeRole, getRoleDisplayName } from '../../services/usuariosService';
import { formatTimePanama, PANAMA_TIMEZONE } from '../../utils/formatters';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  user: UserAuth;
  config?: ConfiguracionNegocio;
  onLogout: () => void;
  onBackToPublic: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  user,
  config,
  onLogout,
  onBackToPublic,
  children,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [horaPanama, setHoraPanama] = useState(() => formatTimePanama(new Date()));
  const [supabaseReady, setSupabaseReady] = useState(() => isSupabaseConfigured());

  useEffect(() => {
    const timer = setInterval(() => {
      setHoraPanama(formatTimePanama(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleConfigChange = () => setSupabaseReady(isSupabaseConfigured());
    window.addEventListener('delicias_supabase_config_changed', handleConfigChange);
    return () => window.removeEventListener('delicias_supabase_config_changed', handleConfigChange);
  }, []);
  const userRole = normalizeRole(user.role);
  const isAdmin = userRole === 'admin';
  const roleDisplay = getRoleDisplayName(userRole);
  const userName = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');

  /**
   * Permissions:
   * - ADMINISTRADOR: Dashboard, Ventas, Productos, Inventario, Producción, Categorías, Usuarios, Configuración
   * - CAJERO: Dashboard, Ventas, Inventario
   */
  const allNavItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ventas', label: isAdmin ? 'Historial de Ventas' : 'Punto de Venta (POS)', icon: BadgeDollarSign },
    { id: 'productos', label: 'Productos', icon: Package }, // Available to both Admin and Cajero
    { id: 'promociones', label: 'Promociones & Ofertas', icon: Tag, adminOnly: true },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'produccion', label: 'Producción', icon: Factory, adminOnly: true },
    { id: 'categorias', label: 'Categorías', icon: FolderTree, adminOnly: true },
    { id: 'usuarios', label: 'Usuarios', icon: Shield, adminOnly: true },
    { id: 'configuracion', label: 'Configuración', icon: Settings, adminOnly: true },
  ];

  const visibleNavItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  const handleTabClick = (tab: AdminTab) => {
    onSelectTab(tab);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex flex-col md:flex-row text-stone-800">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-stone-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5">
          {config?.logoUrl ? (
            <img
              src={config.logoUrl}
              alt="Logo"
              className="h-8 w-8 aspect-square rounded-full object-contain"
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
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white">
              <Cake className="w-4 h-4" />
            </div>
          )}
          <div>
            <span className="font-serif font-bold text-sm tracking-tight block">
              {config?.nombre || 'Delicias Belgi'}
            </span>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
              {roleDisplay}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 rounded-lg bg-stone-800 text-stone-300 cursor-pointer"
          aria-label="Abrir menú"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop when Sidebar is open */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-stone-900 text-stone-300 flex flex-col justify-between border-r border-stone-800 transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          mobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-stone-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config?.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt="Logo"
                  className="h-10 w-10 aspect-square rounded-full object-contain"
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
                <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-amber-50 shadow-md">
                  <Cake className="w-6 h-6" />
                </div>
              )}
              <div>
                <span className="font-serif text-lg font-bold text-white block leading-tight">
                  {config?.nombre || 'Delicias Belgi'}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block mt-0.5">
                  {isAdmin ? 'Panel Administrador' : 'Terminal Cajero'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="md:hidden text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info card inside sidebar */}
          <div className="px-4 py-3 mx-4 my-3 rounded-xl bg-stone-800/60 border border-stone-700/50">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-xs font-bold text-white truncate block capitalize">
                  {userName}
                </span>
                <span className="text-[10px] text-stone-400 truncate block">
                  {user.email || 'usuario@deliciasbelgi.com'}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                  isAdmin
                    ? 'bg-amber-900/80 text-amber-300 border border-amber-600/50'
                    : 'bg-blue-900/80 text-blue-300 border border-blue-600/50'
                }`}
              >
                {roleDisplay}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Menú Principal
            </div>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-950/30 font-bold'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User & System Status Bottom */}
        <div className="p-4 border-t border-stone-800/80 space-y-2.5">
          {/* Connection badge */}
          <div className="p-2 rounded-lg bg-stone-800/70 border border-stone-700/60 flex items-center gap-2 text-[11px]">
            {supabaseReady ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-medium truncate">Supabase Conectado</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-300 font-medium truncate">Modo Local</span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-1">
            <button
              id="back-to-public-btn"
              onClick={onBackToPublic}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Tienda Pública</span>
            </button>
            <button
              id="admin-logout-btn"
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400 font-medium">Panel</span>
              <span className="text-stone-300">/</span>
              <span className="font-bold text-stone-800 capitalize">
                {currentTab}
              </span>
            </div>

            {/* Panama Timezone Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Colón, PA:</span>
              <span className="font-mono font-bold text-amber-950">{horaPanama}</span>
            </div>
          </div>

          {/* Header User profile & Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-stone-900 block leading-tight capitalize">
                {userName}
              </span>
              <span
                className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${
                  isAdmin
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}
              >
                {roleDisplay}
              </span>
            </div>
            <div className="h-6 w-px bg-stone-200 hidden sm:block" />
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-400 group-hover:text-rose-600" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
};
