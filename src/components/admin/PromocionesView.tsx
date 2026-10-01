import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Flame,
  Percent,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  FileCode,
  Copy,
  CloudUpload,
  Database,
} from 'lucide-react';
import { Promocion, Producto, ConfiguracionNegocio } from '../../types';
import { promocionesService, PROMOCIONES_SQL } from '../../services/promocionesService';
import { isSupabaseConfigured, getSupabaseClient } from '../../services/supabase';
import { syncService } from '../../services/syncService';
import { formatCurrency, cleanWhatsAppNumber } from '../../utils/formatters';
import { ImageUploadInput } from '../common/ImageUploadInput';

interface PromocionesViewProps {
  promociones: Promocion[];
  productos: Producto[];
  config?: ConfiguracionNegocio;
  onRefreshData?: () => void;
}

const BADGE_PRESETS = [
  '🔥 2x1 DULZURA',
  '⚡ 20% DE DESCUENTO',
  '⭐ COMBO ESPECIAL',
  '🎉 OFERTA DE HOY',
  '🎂 PROMO CUMPLEAÑOS',
  '🎁 REGALO POR TU COMPRA',
  '💥 PRECIO ESPECIAL',
];

export const PromocionesView: React.FC<PromocionesViewProps> = ({
  promociones,
  productos,
  config,
  onRefreshData,
}) => {
  const [editingPromo, setEditingPromo] = useState<Partial<Promocion> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<Promocion | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [clearAllLoading, setClearAllLoading] = useState(false);

  // Supabase quick tools state
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const isConnected = isSupabaseConfigured();

  const [supabaseStatus, setSupabaseStatus] = useState<{
    checked: boolean;
    configured: boolean;
    tableExists: boolean;
    isPermissionDenied: boolean;
    cloudCount: number;
    errorMsg?: string;
  }>({
    checked: false,
    configured: isSupabaseConfigured(),
    tableExists: false,
    isPermissionDenied: false,
    cloudCount: 0,
  });

  const checkSupabaseStatus = async () => {
    const configured = isSupabaseConfigured();
    const client = getSupabaseClient();
    if (!configured || !client) {
      setSupabaseStatus({
        checked: true,
        configured: false,
        tableExists: false,
        isPermissionDenied: false,
        cloudCount: 0,
      });
      return;
    }

    try {
      const { data, error } = await client.from('promociones').select('id');
      if (error) {
        const isPerm = error.code === '42501' || error.message?.includes('permission denied');
        setSupabaseStatus({
          checked: true,
          configured: true,
          tableExists: isPerm, // The table exists in PostgreSQL, but permission was denied
          isPermissionDenied: isPerm,
          cloudCount: 0,
          errorMsg: error.message,
        });
      } else {
        setSupabaseStatus({
          checked: true,
          configured: true,
          tableExists: true,
          isPermissionDenied: false,
          cloudCount: data?.length || 0,
        });
      }
    } catch (e: any) {
      const isPerm = e?.code === '42501' || e?.message?.includes('permission denied');
      setSupabaseStatus({
        checked: true,
        configured: true,
        tableExists: isPerm,
        isPermissionDenied: isPerm,
        cloudCount: 0,
        errorMsg: e?.message,
      });
    }
  };

  useEffect(() => {
    checkSupabaseStatus();
    const handleCfgChanged = () => {
      checkSupabaseStatus();
    };
    window.addEventListener('delicias_supabase_config_changed', handleCfgChanged);
    return () => window.removeEventListener('delicias_supabase_config_changed', handleCfgChanged);
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(PROMOCIONES_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const handleSyncPromociones = async () => {
    setSyncingSupabase(true);
    try {
      const res = await syncService.sincronizarTodoConSupabase();
      setFeedback(`¡Sincronización a Supabase completada! Se subieron ${res.promocionesCount || promociones.length} promociones a la nube.`);
      await checkSupabaseStatus();
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback('Error al sincronizar con Supabase: ' + (err.message || 'Error desconocido'));
      setTimeout(() => setFeedback(null), 7000);
    } finally {
      setSyncingSupabase(false);
    }
  };

  const activeCount = promociones.filter((p) => p.activa).length;
  const floatingCount = promociones.filter((p) => p.activa && p.mostrarModalInicio).length;

  const handleOpenNew = () => {
    setEditingPromo({
      titulo: '',
      subtitulo: '',
      descripcion: '',
      etiqueta: '🔥 OFERTA ESPECIAL',
      descuentoPorcentaje: 0,
      precioRegular: 0,
      precioOferta: 0,
      imagen: '',
      productoId: '',
      activa: true,
      mostrarModalInicio: true,
      orden: promociones.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo: Promocion) => {
    setEditingPromo({ ...promo });
    setIsModalOpen(true);
  };

  const handleSelectProduct = (prodId: string) => {
    const prod = productos.find((p) => p.id === prodId);
    if (!prod) return;

    setEditingPromo((prev) => ({
      ...prev,
      productoId: prod.id,
      titulo: prev?.titulo || `¡Promo en ${prod.nombre}!`,
      descripcion: prev?.descripcion || prod.descripcion,
      precioRegular: prod.precio,
      precioOferta: prev?.precioOferta || prod.precio * 0.85,
      descuentoPorcentaje: prev?.descuentoPorcentaje || 15,
      imagen: prev?.imagen || prod.imagen,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo || !editingPromo.titulo?.trim()) {
      setFeedback('Error: El título de la promoción es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      if (editingPromo.id) {
        await promocionesService.actualizarPromocion(editingPromo.id, editingPromo);
        setFeedback('✓ Promoción actualizada con éxito.');
      } else {
        await promocionesService.crearPromocion(editingPromo as any);
        setFeedback('✓ Nueva promoción guardada con éxito.');
      }
      setIsModalOpen(false);
      setEditingPromo(null);
      await checkSupabaseStatus();
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      // Keep changes saved locally and close modal, while displaying clear cloud notification
      setIsModalOpen(false);
      setEditingPromo(null);
      onRefreshData?.();
      setFeedback(err.message || 'Error al guardar la promoción.');
      await checkSupabaseStatus();
      setTimeout(() => setFeedback(null), 8000);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!promoToDelete?.id) return;
    setDeleteLoading(true);
    try {
      await promocionesService.eliminarPromocion(promoToDelete.id);
      setFeedback(`Promoción "${promoToDelete.titulo}" eliminada.`);
      setPromoToDelete(null);
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback('Error al eliminar: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActiva = async (id?: string) => {
    if (!id) return;
    try {
      await promocionesService.toggleActiva(id);
      onRefreshData?.();
    } catch (err: any) {
      console.warn(err);
    }
  };

  const handleToggleModalInicio = async (id?: string) => {
    if (!id) return;
    try {
      await promocionesService.toggleModalInicio(id);
      onRefreshData?.();
    } catch (err: any) {
      console.warn(err);
    }
  };

  const handleClearAllPromos = async () => {
    setClearAllLoading(true);
    try {
      await promocionesService.eliminarTodasLasPromociones();
      setIsClearAllOpen(false);
      setFeedback('Todas las promociones han sido eliminadas. Puedes crear las tuyas cuando quieras.');
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      setFeedback('Error al eliminar promociones: ' + err.message);
    } finally {
      setClearAllLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-pink-600" />
            <span>Gestión de Promociones & Ofertas</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Configura descuentos, combos y ofertas que tus clientes verán en la tienda y en la ventana flotante de bienvenida.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="px-3.5 py-2.5 rounded-2xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Ver código SQL para crear la tabla promociones en Supabase"
          >
            <FileCode className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">1. Ver SQL Supabase</span>
            <span className="sm:hidden">SQL</span>
          </button>

          {isConnected && (
            <button
              type="button"
              onClick={handleSyncPromociones}
              disabled={syncingSupabase}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Sincronizar tus promociones a la base de datos en la nube"
            >
              {syncingSupabase ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">2. Sincronizar en la Nube</span>
              <span className="sm:hidden">Subir</span>
            </button>
          )}

          {promociones.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Eliminar todas las promociones actuales"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Vaciar Promociones</span>
            </button>
          )}

          <button
            onClick={handleOpenNew}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white font-bold text-xs shadow-md shadow-pink-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Promoción</span>
          </button>
        </div>
      </div>

      {/* Real-time Cloud Status Banner */}
      {supabaseStatus.checked && (
        <>
          {!supabaseStatus.configured ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-900 font-bold text-sm">
                    Modo Local: Supabase no está conectado en este navegador
                  </strong>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                    Tus promociones se guardan en la memoria de este equipo, pero <strong>no se guardan en la nube</strong> porque faltan las credenciales de Supabase.
                    Para conectarlo, ve a la pestaña <strong>"Configuración" &gt; apartado "Supabase"</strong> y guarda tu <strong>Project URL</strong> y <strong>Anon Key</strong>.
                  </p>
                </div>
              </div>
            </div>
          ) : supabaseStatus.isPermissionDenied ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-900 font-bold text-sm">
                    Faltan permisos de acceso en Supabase (Error 42501: permission denied)
                  </strong>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                    ¡La tabla <code className="bg-amber-100 px-1 rounded font-mono font-bold">promociones</code> ya está creada en tu base de datos! Sin embargo, PostgreSQL tiene bloqueado el permiso a la clave pública anon. Debes ejecutar el comando <code className="bg-amber-100 px-1 rounded font-mono font-bold">GRANT</code> en Supabase para desbloquearla.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSqlModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Ver SQL y Desbloquear</span>
                </button>
              </div>
            </div>
          ) : !supabaseStatus.tableExists ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-rose-900 font-bold text-sm">
                    Falta crear la tabla "promociones" en tu base de datos de Supabase
                  </strong>
                  <p className="text-rose-800 text-[11px] mt-0.5 leading-relaxed">
                    Supabase está conectado, pero rechaza guardar porque la tabla <code className="bg-rose-100 px-1 rounded font-mono font-bold">promociones</code> no existe en PostgreSQL.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSqlModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Ver SQL y Solucionar</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900">
                    Nube Activa con Supabase
                  </span>
                  <span className="text-emerald-700 text-[11px] ml-1.5">
                    — Tabla <code className="font-mono">promociones</code> lista con {supabaseStatus.cloudCount} promociones sincronizadas en tiempo real.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncPromociones}
                disabled={syncingSupabase}
                className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>{syncingSupabase ? 'Subiendo...' : 'Sincronizar ahora'}</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Guide Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-amber-50/50 to-pink-50 border border-pink-200 text-xs text-stone-700 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-pink-600 text-white shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-stone-900 text-sm mb-0.5">
              ¿Cómo poner tus propias promociones?
            </h4>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              1. Haz clic en <strong>"+ Nueva Promoción"</strong>.<br />
              2. Elige si quieres vincular un producto de tu tienda o crear un combo propio (ej: "2x1", "Combo Fiesta", "15% de Descuento").<br />
              3. Ponle su precio de oferta y activa si quieres que salga en la <strong>ventana flotante al entrar</strong> a la web.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="self-start md:self-center px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
        >
          + Crear Promoción Ahora
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-pink-50 text-pink-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Promociones
            </span>
            <span className="text-xl font-extrabold text-stone-900">{promociones.length}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Activas en Tienda
            </span>
            <span className="text-xl font-extrabold text-emerald-700">{activeCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              En Ventana Flotante
            </span>
            <span className="text-xl font-extrabold text-amber-700">{floatingCount}</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Promociones List */}
      <div className="space-y-4">
        {promociones.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white border border-stone-200 text-center text-stone-500">
            <Tag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-bold text-stone-800 text-base">No tienes promociones registradas aún</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              Crea tu primera promoción (como un 2x1 en dulces o descuento en pedidos) para atraer más clientes.
            </p>
            <button
              onClick={handleOpenNew}
              className="mt-4 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              + Crear Primera Promoción
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promociones.map((promo) => (
              <div
                key={promo.id}
                className={`p-5 rounded-3xl border transition-all ${
                  promo.activa
                    ? 'bg-white border-pink-200 shadow-xs hover:shadow-md'
                    : 'bg-stone-50 border-stone-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-100 text-pink-700 border border-pink-200">
                      {promo.etiqueta || 'OFERTA'}
                    </span>
                    {promo.mostrarModalInicio && promo.activa && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>Ventana Flotante</span>
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        promo.activa
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {promo.activa ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(promo)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-pink-600 hover:bg-pink-50 transition-colors"
                      title="Editar promoción"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoToDelete(promo)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Eliminar promoción"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  {promo.imagen ? (
                    <img
                      src={promo.imagen}
                      alt={promo.titulo}
                      className="w-20 h-20 rounded-2xl object-cover border border-stone-200 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-pink-50 border border-pink-100 text-pink-400 flex items-center justify-center shrink-0">
                      <Tag className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-base text-stone-900 truncate">
                      {promo.titulo}
                    </h3>
                    {promo.subtitulo && (
                      <p className="text-xs font-semibold text-pink-700 truncate">
                        {promo.subtitulo}
                      </p>
                    )}
                    {promo.descripcion && (
                      <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                        {promo.descripcion}
                      </p>
                    )}

                    <div className="mt-2 flex items-baseline gap-2">
                      {promo.precioOferta ? (
                        <>
                          <span className="text-base font-extrabold text-pink-600">
                            {formatCurrency(promo.precioOferta)}
                          </span>
                          {promo.precioRegular && promo.precioRegular > promo.precioOferta && (
                            <span className="text-xs text-stone-400 line-through">
                              {formatCurrency(promo.precioRegular)}
                            </span>
                          )}
                        </>
                      ) : promo.descuentoPorcentaje ? (
                        <span className="text-sm font-extrabold text-emerald-600">
                          {promo.descuentoPorcentaje}% de descuento
                        </span>
                      ) : (
                        <span className="text-xs text-stone-500 italic">Oferta especial</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick actions bar */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleActiva(promo.id)}
                    className="font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    {promo.activa ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Activar</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleModalInicio(promo.id)}
                    className={`font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      promo.mostrarModalInicio
                        ? 'text-amber-700 hover:text-amber-800'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                    title="Alternar si se muestra en la ventana flotante de bienvenida"
                  >
                    <span>Flotante: {promo.mostrarModalInicio ? 'Sí' : 'No'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && editingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-pink-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-pink-600" />
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  {editingPromo.id ? 'Editar Promoción' : 'Nueva Promoción u Oferta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Optional: Pick existing product to auto-fill */}
              {productos.length > 0 && (
                <div className="p-3 rounded-2xl bg-pink-50/70 border border-pink-200">
                  <label className="block font-bold text-pink-900 mb-1">
                    Vincular a un Producto Existente (Opcional)
                  </label>
                  <select
                    value={editingPromo.productoId || ''}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">-- Personalizado (Combo o Promoción General) --</option>
                    {productos.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.nombre} ({formatCurrency(prod.precio)}) - {prod.categoria}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Título de la Promoción */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Título de la Promoción *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ¡2x1 en Alfajores Artesanales!"
                  value={editingPromo.titulo || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, titulo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-stone-800 text-sm font-semibold"
                />
              </div>

              {/* Subtítulo o gancho */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Subtítulo o Frase Llamativa
                </label>
                <input
                  type="text"
                  placeholder="Ej: Llévate dos cajas al precio de una"
                  value={editingPromo.subtitulo || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, subtitulo: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Etiqueta / Badge */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Etiqueta / Distintivo de la Oferta
                </label>
                <input
                  type="text"
                  value={editingPromo.etiqueta || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, etiqueta: e.target.value })}
                  placeholder="Ej: 🔥 2x1 DULZURA"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {BADGE_PRESETS.map((badge) => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => setEditingPromo({ ...editingPromo, etiqueta: badge })}
                      className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-pink-100 hover:text-pink-700 text-[10px] font-semibold text-stone-600 transition-colors"
                    >
                      {badge}
                    </button>
                  ))}
                </div>
              </div>

              {/* Precios y Descuento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Precio Regular ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="12.00"
                    value={editingPromo.precioRegular ?? ''}
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, precioRegular: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Precio de Oferta ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="6.00"
                    value={editingPromo.precioOferta ?? ''}
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, precioOferta: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-300 bg-pink-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold text-pink-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    % Descuento (Opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    value={editingPromo.descuentoPorcentaje ?? ''}
                    onChange={(e) =>
                      setEditingPromo({
                        ...editingPromo,
                        descuentoPorcentaje: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Descripción o Condiciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre qué incluye la promoción, vigencia o cómo ordenarla..."
                  value={editingPromo.descripcion || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, descripcion: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Imagen */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Foto de la Promoción
                </label>
                <ImageUploadInput
                  value={editingPromo.imagen || ''}
                  onChange={(url) => setEditingPromo({ ...editingPromo, imagen: url })}
                  placeholder="Pega un enlace o sube una foto de la promo"
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPromo.activa !== false}
                    onChange={(e) => setEditingPromo({ ...editingPromo, activa: e.target.checked })}
                    className="w-4 h-4 text-pink-600 rounded"
                  />
                  <div>
                    <span className="font-bold text-stone-800 block">Promoción Activa</span>
                    <span className="text-[10px] text-stone-500">Visible para los clientes</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPromo.mostrarModalInicio !== false}
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, mostrarModalInicio: e.target.checked })
                    }
                    className="w-4 h-4 text-pink-600 rounded"
                  />
                  <div>
                    <span className="font-bold text-stone-800 block">Ventana Flotante al Inicio</span>
                    <span className="text-[10px] text-stone-500">Apenas el cliente entra a la web</span>
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold flex items-center gap-2 shadow-md shadow-pink-600/20 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingPromo.id ? 'Guardar Cambios' : 'Crear Promoción'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {promoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">¿Eliminar Promoción?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Se eliminará "{promoToDelete.titulo}" y ya no aparecerá en la tienda ni en la ventana flotante.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPromoToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {deleteLoading ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL PROMOS MODAL */}
      {isClearAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">¿Vaciar Todas las Promociones?</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Se eliminarán todas las promociones actuales ({promociones.length}) para que puedas crear las tuyas cuando quieras.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsClearAllOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearAllPromos}
                disabled={clearAllLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
              >
                {clearAllLoading ? 'Vaciando...' : 'Sí, Vaciar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Script SQL de Supabase para Promociones */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-xl w-full p-6 rounded-3xl shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    Script SQL para Crear la Tabla "promociones"
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Ejecútalo una sola vez en tu panel de Supabase en la nube.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-700">
              <p className="font-semibold text-stone-900">
                Pasos para que se guarden en la nube de Supabase:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-stone-600">
                <li>Entra a tu cuenta en <strong className="text-emerald-700">Supabase.com</strong> y abre tu proyecto.</li>
                <li>En el menú lateral izquierdo haz clic en <strong>SQL Editor</strong>.</li>
                <li>Presiona <strong>New query</strong>.</li>
                <li>Haz clic en el botón verde de abajo <strong>"Copiar Código SQL"</strong>, pégalo en Supabase y presiona <strong>RUN</strong>.</li>
                <li>¡Listo! Tu tabla de promociones quedará creada con permisos de lectura, escritura y sincronización en tiempo real.</li>
              </ol>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between bg-stone-800 text-stone-200 px-3 py-2 rounded-t-xl text-[11px] font-mono">
                <span>tabla_promociones.sql</span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                >
                  {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{sqlCopied ? '¡Copiado al Portapapeles!' : 'Copiar Código SQL'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-b-xl bg-stone-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-64 select-all">
                {PROMOCIONES_SQL}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
