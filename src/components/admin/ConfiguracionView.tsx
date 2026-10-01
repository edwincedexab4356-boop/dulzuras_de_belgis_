import React, { useState } from 'react';
import {
  Settings,
  Save,
  Check,
  Building,
  Phone,
  Clock,
  MapPin,
  Share2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  Eye,
  X,
  Users,
  Database,
  Copy,
  FileCode,
  CloudUpload,
  Info,
} from 'lucide-react';
import { ConfiguracionNegocio, HorariosSemana, Producto } from '../../types';
import { configuracionService } from '../../services/configuracionService';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  isSupabaseConfigured,
  testSupabaseConnection,
  SUPABASE_SCHEMA_SQL,
} from '../../services/supabase';
import { syncService } from '../../services/syncService';
import { seedInitialData } from '../../services/initialData';
import { formatCurrency } from '../../utils/formatters';
import { ImageUploadInput } from '../common/ImageUploadInput';
import { CajerosManager } from './CajerosManager';

interface ConfiguracionViewProps {
  config: ConfiguracionNegocio;
  productos?: Producto[];
  onRefreshData?: () => void;
}

const DIAS_KEYS: { key: keyof HorariosSemana; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const FORMAL_HERO_SUBTITULO =
  'En Delicias Belgi nos dedicamos a la alta repostería artesanal y dulcería fina, confeccionando creaciones selectas con ingredientes de primera calidad en Ciudad de Colón.';

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  config,
  productos = [],
  onRefreshData,
}) => {
  const initialCleanSubtitulo =
    !config.heroSubtitulo ||
    config.heroSubtitulo.toLowerCase().includes('bolis') ||
    config.heroSubtitulo.toLowerCase().includes('helado') ||
    config.heroSubtitulo.toLowerCase().includes('preparada con amor')
      ? FORMAL_HERO_SUBTITULO
      : config.heroSubtitulo;

  const [formData, setFormData] = useState<ConfiguracionNegocio>({
    ...config,
    heroSubtitulo: initialCleanSubtitulo,
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Supabase state
  const initialSupabase = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialSupabase.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialSupabase.anonKey);
  const [supabaseConnected, setSupabaseConnected] = useState(() => isSupabaseConfigured());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);

  const handleSaveSupabaseCredentials = () => {
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    setSupabaseConnected(isSupabaseConfigured());
    setSuccessMsg('Credenciales de Supabase guardadas en el navegador.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleTestSupabase = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
      const res = await testSupabaseConnection();
      setConnectionResult(res);
      setSupabaseConnected(res.success && isSupabaseConfigured());
    } catch (e: any) {
      setConnectionResult({
        success: false,
        message: e?.message || 'Error de conexión con Supabase',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCopySqlScript = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const handleSyncToSupabase = async () => {
    setSyncingSupabase(true);
    setErrorMsg(null);
    try {
      const res = await syncService.sincronizarTodoConSupabase();
      setSuccessMsg(
        `¡Sincronización a Supabase completada! Se subieron ${res.productosCount} productos, ${res.promocionesCount || 0} promociones, ${res.categoriasCount} categorías, ${res.ventasCount} ventas y ${res.produccionesCount} producciones.`
      );
      onRefreshData?.();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg('Error al sincronizar con Supabase: ' + (err.message || 'Error desconocido'));
    } finally {
      setSyncingSupabase(false);
    }
  };

  const handleHorarioChange = (
    dia: keyof HorariosSemana,
    field: 'activo' | 'apertura' | 'cierre',
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [dia]: {
          ...(prev.horarios?.[dia] || { activo: true, apertura: '09:00', cierre: '19:30' }),
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      setErrorMsg(null);
      await configuracionService.guardarConfiguracion(formData);
      setSuccessMsg('Configuración guardada exitosamente.');
      onRefreshData?.();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg('Error al guardar configuración: ' + (err.message || 'Error desconocido'));
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemoData = () => {
    if (!window.confirm('¿Deseas restablecer los datos de demostración de Delicias Belgi?')) return;
    seedInitialData();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-amber-600" />
            <span>Configuración del Negocio</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Personaliza la identidad de Delicias Belgi, horarios, teléfono, WhatsApp y ubicación.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </>
          )}
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Supabase Connection & Migration Center */}
      <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-emerald-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-stone-900">
                  Base de Datos en la Nube (Supabase PostgreSQL)
                </h4>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    supabaseConnected
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {supabaseConnected ? '✓ Conectado a Supabase' : 'Modo Local (Sin Conexión a Supabase)'}
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                La aplicación utiliza Supabase (PostgreSQL + Auth + Realtime). Si no ingresas credenciales, funciona automáticamente en modo local con almacenamiento en el navegador.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <FileCode className="w-4 h-4 text-emerald-700" />
              <span>{showSqlGuide ? 'Ocultar Guía & SQL' : '1. Ver Script SQL para Supabase'}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncToSupabase}
              disabled={syncingSupabase || !supabaseConnected}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              title={!supabaseConnected ? 'Conecta primero a Supabase' : 'Sube todos tus datos locales a Supabase'}
            >
              {syncingSupabase ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              <span>2. Sincronizar Datos a Supabase</span>
            </button>
          </div>
        </div>

        {/* Formulario de Configuración de Supabase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
              Project URL de Supabase (VITE_SUPABASE_URL)
            </label>
            <input
              type="url"
              placeholder="https://tu-proyecto.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <span className="text-[10px] text-stone-500 mt-1 block">
              Encuéntrala en Supabase &gt; Project Settings &gt; API &gt; Project URL
            </span>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
              Anon Key pública de Supabase (VITE_SUPABASE_ANON_KEY)
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <span className="text-[10px] text-stone-500 mt-1 block">
              Encuéntrala en Supabase &gt; Project Settings &gt; API &gt; Project API Keys &gt; anon public
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSupabaseCredentials}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Credenciales</span>
            </button>

            <button
              type="button"
              onClick={handleTestSupabase}
              disabled={testingConnection || !supabaseUrl || !supabaseAnonKey}
              className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {testingConnection ? (
                <div className="w-3.5 h-3.5 border-2 border-stone-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>Probar Conexión</span>
            </button>
          </div>

          {connectionResult && (
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                connectionResult.success
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              {connectionResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{connectionResult.message}</span>
            </div>
          )}
        </div>

        {/* Guía de instalación y Script SQL */}
        {showSqlGuide && (
          <div className="mt-4 pt-4 border-t border-emerald-200 space-y-4 text-xs text-stone-700">
            <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-3">
              <h5 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-700" />
                <span>¿Cómo migrarte a Supabase en 3 sencillos pasos?</span>
              </h5>

              <ol className="list-decimal pl-5 space-y-2 text-xs text-stone-700 leading-relaxed">
                <li>
                  <strong>Crear tu cuenta y proyecto:</strong> Ingresa a{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-bold underline"
                  >
                    supabase.com
                  </a>{' '}
                  y crea un proyecto nuevo gratuito (por ejemplo: <em>delicias-belgi</em>).
                </li>
                <li>
                  <strong>Ejecutar el Script SQL:</strong> En tu panel de Supabase, haz clic en el menú lateral izquierdo en <strong>SQL Editor</strong>, presiona <strong>New query</strong>, pega el script de abajo y presiona <strong>RUN</strong>. Esto creará automáticamente todas las tablas con RLS y Realtime activado.
                </li>
                <li>
                  <strong>Copiar tus credenciales:</strong> En Supabase ve a <strong>Project Settings &gt; API</strong>, copia la <strong>Project URL</strong> y la clave <strong>anon public</strong> y pégalas arriba. Haz clic en "Guardar Credenciales" y luego en "2. Sincronizar Datos a Supabase".
                </li>
              </ol>

              <div className="relative mt-3">
                <div className="flex items-center justify-between bg-stone-800 text-stone-200 px-3 py-2 rounded-t-lg text-[11px] font-mono">
                  <span>supabase_schema.sql (Tablas: productos, categorias, ventas, inventario, producciones, etc.)</span>
                  <button
                    type="button"
                    onClick={handleCopySqlScript}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{sqlCopied ? '¡Script Copiado!' : 'Copiar Script Completo'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-b-lg bg-stone-900 text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-64 select-all">
                  {SUPABASE_SCHEMA_SQL}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Identidad y Textos */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
            <Building className="w-5 h-5 text-amber-800" />
            <h3 className="font-serif font-bold text-stone-900 text-base">
              Identidad de la Marca
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Nombre del Negocio
              </label>
              <input
                type="text"
                required
                value={formData.nombre || ''}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Eslogan Oficial
              </label>
              <input
                type="text"
                placeholder="Repostería para todos tus eventos!!"
                value={formData.eslogan || ''}
                onChange={(e) => setFormData({ ...formData, eslogan: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Aviso de Marca Registrada (Pie de página y portada)
              </label>
              <input
                type="text"
                placeholder="Marca debidamente registrada en el Registro Público de Panamá"
                value={formData.marcaRegistradaTexto || ''}
                onChange={(e) => setFormData({ ...formData, marcaRegistradaTexto: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Descripción Breve de la Marca
              </label>
              <input
                type="text"
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
              Historia / Presentación en la Tienda Pública
            </label>
            <textarea
              rows={3}
              value={formData.presentacionTexto || ''}
              onChange={(e) => setFormData({ ...formData, presentacionTexto: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Título Principal de la Portada (Hero)
              </label>
              <input
                type="text"
                placeholder="El sabor artesanal que alegra tus mejores momentos"
                value={formData.heroTitulo || ''}
                onChange={(e) => setFormData({ ...formData, heroTitulo: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Subtítulo / Mensaje de Portada (Hero)
              </label>
              <textarea
                rows={2}
                placeholder="En Delicias Belgi nos dedicamos a la alta repostería artesanal..."
                value={formData.heroSubtitulo || ''}
                onChange={(e) => setFormData({ ...formData, heroSubtitulo: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Galería e Imágenes de la Web (Hero, Logo y Fotos debajo del menú) */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-amber-800" />
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Imágenes de la Web y Galería
                </h3>
                <p className="text-xs text-stone-500">
                  Sube fotos directamente desde los archivos de tu equipo o ingresa un enlace web.
                </p>
              </div>
            </div>
          </div>

          {/* Logo & Portada Principal (Hero) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-stone-50/70 border border-stone-200/70">
              <ImageUploadInput
                label="Logo del Negocio (Barra Superior y Tickets)"
                value={formData.logoUrl || ''}
                onChange={(val) => setFormData({ ...formData, logoUrl: val })}
                helperText="Aparece en la barra de navegación, el pie de página y comprobantes."
                previewHeight="h-28"
              />
            </div>

            <div className="p-4 rounded-xl bg-stone-50/70 border border-stone-200/70">
              <ImageUploadInput
                label="Foto de Portada Principal (Hero)"
                value={formData.heroImagen || ''}
                onChange={(val) => setFormData({ ...formData, heroImagen: val })}
                helperText="La imagen grande que da la bienvenida a tus clientes al entrar a la web."
                previewHeight="h-28"
              />
            </div>
          </div>

          {/* Fotos debajo del Menú (Sección Nosotros / Tradición) */}
          <div className="pt-3 border-t border-stone-100">
            <div className="mb-3">
              <h4 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-2">
                <span>Fotos debajo del Menú (Galería / Sección Nosotros)</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  4 Fotografías
                </span>
              </h4>
              <p className="text-xs text-stone-500">
                Estas 4 fotos se exhiben en la sección "Nuestra Historia & Pasión" justo debajo del menú digital.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <ImageUploadInput
                  label="Foto 1 (Cheesecake / Especialidad)"
                  value={
                    formData.historiaImagen1 !== undefined
                      ? formData.historiaImagen1
                      : 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80'
                  }
                  onChange={(val) => setFormData({ ...formData, historiaImagen1: val })}
                  previewHeight="h-32"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <ImageUploadInput
                  label="Foto 2 (Alfajores / Dulces)"
                  value={
                    formData.historiaImagen2 !== undefined
                      ? formData.historiaImagen2
                      : 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=80'
                  }
                  onChange={(val) => setFormData({ ...formData, historiaImagen2: val })}
                  previewHeight="h-32"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <ImageUploadInput
                  label="Foto 3 (Dulcería / Postres)"
                  value={
                    formData.historiaImagen3 !== undefined
                      ? formData.historiaImagen3
                      : 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?auto=format&fit=crop&w=500&q=80'
                  }
                  onChange={(val) => setFormData({ ...formData, historiaImagen3: val })}
                  previewHeight="h-32"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                <ImageUploadInput
                  label="Foto 4 (Tortas / Cacao)"
                  value={
                    formData.historiaImagen4 !== undefined
                      ? formData.historiaImagen4
                      : 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80'
                  }
                  onChange={(val) => setFormData({ ...formData, historiaImagen4: val })}
                  previewHeight="h-32"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contacto y WhatsApp */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
            <Phone className="w-5 h-5 text-amber-800" />
            <h3 className="font-serif font-bold text-stone-900 text-base">
              Contacto y Canales de Atención
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Teléfono Directo
              </label>
              <input
                type="text"
                value={formData.telefono || ''}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                WhatsApp de Pedidos *
              </label>
              <input
                type="text"
                required
                value={formData.whatsapp || ''}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Instagram (@dulzurasdebelgis)
              </label>
              <input
                type="url"
                value={formData.instagram || ''}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                TikTok (@dulzurasdebelgis)
              </label>
              <input
                type="url"
                placeholder="https://tiktok.com/@dulzurasdebelgis"
                value={formData.tiktok || ''}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Facebook (Dulzuras de Belgi's)
              </label>
              <input
                type="url"
                placeholder="https://facebook.com/dulzurasdebelgis"
                value={formData.facebook || ''}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Dirección Física
              </label>
              <input
                type="text"
                value={formData.direccion || ''}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                Enlace Google Maps
              </label>
              <input
                type="url"
                value={formData.googleMaps || ''}
                onChange={(e) => setFormData({ ...formData, googleMaps: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Políticas de Administrador y Terminal Cajero */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
            <ShieldCheck className="w-5 h-5 text-pink-600" />
            <div>
              <h3 className="font-serif font-bold text-stone-900 text-base">
                Políticas de Seguridad y Terminal Cajero
              </h3>
              <p className="text-xs text-stone-500">
                Restricciones operativas para el rol de administrador y configuración de turnos de caja.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <Check className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  Registrar y Gestionar Productos: Permitido para Administrador
                </span>
                <span className="text-[11px] text-emerald-800 block leading-relaxed mt-0.5">
                  El rol Administrador tiene autorización plena para dar de alta postres, pasteles, crear categorías, ajustar precios y modificar stock desde la sección "Productos" e "Inventario".
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
              <ShieldCheck className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-950 block">
                  Realizar Ventas y Cobros: Exclusivo para Cajero
                </span>
                <span className="text-[11px] text-amber-800 block leading-relaxed mt-0.5">
                  Por política comercial del negocio, el Administrador <strong>no puede realizar ventas ni emitir cobros</strong>. Para facturar clientes en el POS, debe iniciarse sesión con una cuenta de <strong>Cajero</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Apartado de Cajeros (Agregar y eliminar nombre de cajeros) */}
        <CajerosManager
          cajeros={formData.cajerosPredefinidos || []}
          onSaveCajeros={async (nuevaLista) => {
            const updated = { ...formData, cajerosPredefinidos: nuevaLista };
            setFormData(updated);
            await configuracionService.updateConfiguracion({ cajerosPredefinidos: nuevaLista });
            if (onRefreshData) onRefreshData();
          }}
        />

        {/* Horarios de Atención */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
            <Clock className="w-5 h-5 text-amber-800" />
            <h3 className="font-serif font-bold text-stone-900 text-base">
              Horarios de Apertura y Cierre
            </h3>
          </div>

          <div className="space-y-2">
            {DIAS_KEYS.map(({ key, label }) => {
              const diaConfig = formData.horarios?.[key] || { activo: true, apertura: '09:00', cierre: '19:30' };
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100 gap-3"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer sm:w-36">
                    <input
                      type="checkbox"
                      checked={diaConfig.activo}
                      onChange={(e) => handleHorarioChange(key, 'activo', e.target.checked)}
                      className="rounded text-amber-900 focus:ring-amber-900"
                    />
                    <span className="text-xs font-bold text-stone-800">{label}</span>
                  </label>

                  {diaConfig.activo ? (
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-500">Apertura:</span>
                        <input
                          type="time"
                          value={diaConfig.apertura}
                          onChange={(e) => handleHorarioChange(key, 'apertura', e.target.value)}
                          className="px-2 py-1 bg-white border border-stone-200 rounded-lg font-mono text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-500">Cierre:</span>
                        <input
                          type="time"
                          value={diaConfig.cierre}
                          onChange={(e) => handleHorarioChange(key, 'cierre', e.target.value)}
                          className="px-2 py-1 bg-white border border-stone-200 rounded-lg font-mono text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400 italic">Cerrado todo el día</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modalidades de Entrega y Opciones */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
            <Sparkles className="w-5 h-5 text-amber-800" />
            <h3 className="font-serif font-bold text-stone-900 text-base">
              Modalidades y Opciones de Servicio
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.paraLlevar !== false}
                onChange={(e) => setFormData({ ...formData, paraLlevar: e.target.checked })}
                className="rounded text-amber-900 focus:ring-amber-900"
              />
              <div>
                <span className="text-xs font-bold text-stone-800 block">Pedidos Para Llevar</span>
                <span className="text-[11px] text-stone-500 block">Permitir retiro en tienda en PH Bahía Limón</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.aDomicilio !== false}
                onChange={(e) => setFormData({ ...formData, aDomicilio: e.target.checked })}
                className="rounded text-amber-900 focus:ring-amber-900"
              />
              <div>
                <span className="text-xs font-bold text-stone-800 block">Entrega a Domicilio (Delivery)</span>
                <span className="text-[11px] text-stone-500 block">Permitir solicitar pedidos con dirección en Colón</span>
              </div>
            </label>
          </div>
        </div>

        {/* Datos y Mantenimiento */}
        <div className="p-4 rounded-2xl bg-stone-100/80 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-stone-600" />
            <div>
              <span className="text-xs font-bold text-stone-800 block">
                Almacenamiento y Restauración
              </span>
              <span className="text-[11px] text-stone-500 block">
                {supabaseConnected
                  ? 'Base de datos activa en Supabase (PostgreSQL).'
                  : 'Modo local activo con persistencia en el navegador.'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDemoData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-700 hover:text-rose-700 hover:border-rose-300 text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Datos Demo</span>
          </button>
        </div>

      </form>
    </div>
  );
};
