import React, { useState, useEffect } from 'react';
import { Lock, Mail, ArrowLeft, AlertCircle, ShieldCheck, UserCheck, KeyRound, Sparkles } from 'lucide-react';
import { authService } from '../../services/authService';
import { UserAuth, ConfiguracionNegocio } from '../../types';
import { BelgisLogo } from '../common/BelgisLogo';

interface AdminLoginProps {
  onLoginSuccess: (user: UserAuth) => void;
  onBackToPublic: () => void;
  config?: ConfiguracionNegocio;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToPublic,
  config,
}) => {
  const [activeTab, setActiveTab] = useState<'cajero' | 'admin'>('cajero');

  // Pre-configured email and passwords
  const defaultEmail = 'edwinc3d3@gmail.com';
  const [cajeroEmail, setCajeroEmail] = useState(defaultEmail);
  const [cajeroPassword, setCajeroPassword] = useState('cajeroadmin');
  
  // Shift staff selection (configured and saved by the administrator)
  const predefinedStaff = config?.cajerosPredefinidos || [];
  const [selectedStaff, setSelectedStaff] = useState<string>(() => predefinedStaff[0] || 'Cajero de Turno');
  const [customStaff, setCustomStaff] = useState<string>('');
  const [isCustomStaff, setIsCustomStaff] = useState<boolean>(() => predefinedStaff.length === 0);

  useEffect(() => {
    if (predefinedStaff.length > 0) {
      if (!selectedStaff || !predefinedStaff.includes(selectedStaff)) {
        setSelectedStaff(predefinedStaff[0]);
      }
    } else {
      setIsCustomStaff(true);
    }
  }, [predefinedStaff]);

  // Admin credentials
  const [adminEmail, setAdminEmail] = useState(defaultEmail);
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCashierName = predefinedStaff.length > 0
    ? (isCustomStaff ? customStaff.trim() : selectedStaff.trim())
    : customStaff.trim();

  const handleCajeroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cashierName = currentCashierName;
    if (!cashierName) {
      setError('Por favor indica el nombre de la persona que opera la caja.');
      return;
    }

    setLoading(true);
    try {
      const user = await authService.login(cajeroEmail, cajeroPassword, cashierName);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar la jornada de caja.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await authService.login(adminEmail, adminPassword);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión como administrador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6f8] flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back to store button */}
        <button
          onClick={onBackToPublic}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-pink-700 mb-5 ml-4 sm:ml-0 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo Público</span>
        </button>

        {/* Brand header */}
        <div className="text-center">
          {config?.logoUrl ? (
            <img
              src={config.logoUrl}
              alt={config?.nombre || "Dulzuras de Belgi's"}
              className="h-20 w-20 sm:h-24 sm:w-24 aspect-square rounded-full mx-auto mb-2 object-contain drop-shadow-md"
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
            <BelgisLogo size={88} className="mx-auto mb-2" showDetails={false} />
          )}
          <h2 className="font-serif text-3xl font-extrabold text-stone-900 tracking-tight">
            {config?.nombre || "Dulzuras de Belgi's"}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-pink-700 font-semibold italic">
            {config?.eslogan || 'Repostería para todos tus eventos!!'}
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-6 px-6 sm:px-8 rounded-3xl shadow-xl border border-pink-100">
          
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('cajero');
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'cajero'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Terminal Cajero</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-pink-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Administrador</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CAJERO JORNADA */}
          {activeTab === 'cajero' ? (
            <form onSubmit={handleCajeroSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-pink-50/70 border border-pink-200/80 text-xs text-pink-900">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                  <span>Jornada de Caja y Facturación</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Ingreso a la terminal de punto de venta. El nombre del cajero responsable quedará registrado en las operaciones y cobros.
                </p>
              </div>

              {/* Staff Member Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                  <span>Nombre del Cajero o Responsable</span>
                  {predefinedStaff.length > 0 && (
                    <span className="text-[10px] font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
                      Guardados en Modo Admin
                    </span>
                  )}
                </label>

                {predefinedStaff.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {predefinedStaff.map((staffName) => {
                        const isSelected = !isCustomStaff && selectedStaff === staffName;
                        return (
                          <button
                            key={staffName}
                            type="button"
                            onClick={() => {
                              setSelectedStaff(staffName);
                              setIsCustomStaff(false);
                            }}
                            className={`p-2.5 text-left rounded-xl text-xs font-semibold border transition-all cursor-pointer truncate flex items-center gap-2 ${
                              isSelected
                                ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-pink-200'
                            }`}
                          >
                            <UserCheck className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-stone-400'}`} />
                            <span className="truncate">{staffName}</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setIsCustomStaff(true)}
                        className={`p-2.5 text-left rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                          isCustomStaff
                            ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <span className="font-bold text-sm leading-none">+</span>
                        <span className="truncate">Escribir otro nombre</span>
                      </button>
                    </div>

                    {isCustomStaff && (
                      <div className="mt-2 animate-in fade-in duration-200">
                        <input
                          type="text"
                          required
                          placeholder="Escribe el nombre del cajero responsable"
                          value={customStaff}
                          onChange={(e) => setCustomStaff(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-pink-300 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-stone-800"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Escribe el nombre del cajero o responsable"
                      value={customStaff}
                      onChange={(e) => setCustomStaff(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-stone-800 placeholder:text-stone-400"
                    />
                    <p className="text-[11px] text-stone-400 leading-tight">
                      Tip: Puedes agregar y guardar los nombres de tu personal desde el <strong>Modo Administrador &gt; Personal de Cajeros</strong> para seleccionarlos con un clic.
                    </p>
                  </div>
                )}
              </div>

              {/* Generic Email */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Correo genérico de caja
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={cajeroEmail}
                    onChange={(e) => setCajeroEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Cashier Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Contraseña de cajero
                  </label>
                  <span className="text-[10px] font-mono font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-md border border-pink-200">
                    cajeroadmin
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={cajeroPassword}
                    onChange={(e) => setCajeroPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Usa tu correo con la clave <strong className="text-pink-700 font-mono">cajeroadmin</strong> para entrar a cobrar e ingresar productos.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-bold text-sm shadow-md shadow-pink-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>
                      {currentCashierName
                        ? `Iniciar Jornada como ${currentCashierName}`
                        : 'Iniciar Jornada de Caja'}
                    </span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2: ADMINISTRADOR */
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
                Acceso completo para administración, estadísticas, inventarios y configuración general del negocio.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Correo de Administrador
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="admin@deliciasbelgi.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Usa la contraseña que creaste en Supabase Authentication para acceder como Administrador.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Ingresar como Administrador</span>
                )}
              </button>
            </form>
          )}

          {/* Registration footer info */}
          <div className="mt-6 pt-4 border-t border-stone-100 text-center">
            <p className="text-[11px] text-stone-400 font-medium">
              {config?.marcaRegistradaTexto || 'Marca debidamente registrada en el Registro Público de Panamá'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
