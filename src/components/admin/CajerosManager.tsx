import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Search,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface CajerosManagerProps {
  cajeros: string[];
  onSaveCajeros: (cajeros: string[]) => Promise<void> | void;
  readOnly?: boolean;
}

export const CajerosManager: React.FC<CajerosManagerProps> = ({
  cajeros = [],
  onSaveCajeros,
  readOnly = false,
}) => {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);
  const [cajeroAEliminar, setCajeroAEliminar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mostrarMensaje = (tipo: 'exito' | 'error', mensaje: string) => {
    setFeedback({ tipo, mensaje });
    setTimeout(() => {
      setFeedback(null);
    }, 3500);
  };

  const handleAgregar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nombreLimpio = nuevoNombre.trim();

    if (!nombreLimpio) {
      mostrarMensaje('error', 'Por favor ingresa el nombre del cajero.');
      return;
    }

    if (nombreLimpio.length < 2) {
      mostrarMensaje('error', 'El nombre debe contener al menos 2 caracteres.');
      return;
    }

    const existe = cajeros.some(
      (c) => c.toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (existe) {
      mostrarMensaje('error', `"${nombreLimpio}" ya está registrado en la lista de cajeros.`);
      return;
    }

    setIsSaving(true);
    try {
      const nuevaLista = [...cajeros, nombreLimpio];
      await onSaveCajeros(nuevaLista);
      setNuevoNombre('');
      mostrarMensaje('exito', `Cajero "${nombreLimpio}" agregado correctamente.`);
    } catch (err: any) {
      mostrarMensaje('error', 'No se pudo guardar el cajero: ' + (err?.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!cajeroAEliminar) return;

    setIsSaving(true);
    try {
      const nuevaLista = cajeros.filter((c) => c !== cajeroAEliminar);
      await onSaveCajeros(nuevaLista);
      mostrarMensaje('exito', `Cajero "${cajeroAEliminar}" eliminado de la lista.`);
      setCajeroAEliminar(null);
    } catch (err: any) {
      mostrarMensaje('error', 'No se pudo eliminar el cajero: ' + (err?.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrado para búsqueda
  const cajerosFiltrados = cajeros.filter((nombre) =>
    nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Obtener iniciales para el avatar
  const getIniciales = (nombre: string) => {
    const partes = nombre.trim().split(' ').filter(Boolean);
    if (partes.length === 0) return 'CJ';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  // Colores alternados para avatares
  const avatarGradients = [
    'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-indigo-500 to-blue-600',
    'from-purple-500 to-fuchsia-600',
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
      {/* Cabecera del apartado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pink-50 text-pink-700 border border-pink-100 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-stone-900 text-lg sm:text-xl flex items-center gap-2">
              <span>Personal de Cajeros</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-sans font-bold">
                {cajeros.length} {cajeros.length === 1 ? 'registrado' : 'registrados'}
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Agrega y administra los nombres del personal autorizado para operar turnos en la terminal de cobro. Se guardan directamente en el sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
            feedback.tipo === 'exito'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          {feedback.tipo === 'exito' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.mensaje}</span>
        </div>
      )}

      {/* Formulario para agregar cajero */}
      {!readOnly && (
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
            Agregar Nuevo Nombre de Cajero
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAgregar();
                  }
                }}
                placeholder="Ejemplo: Ana Victoria Rodríguez"
                disabled={isSaving}
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all font-medium text-stone-800 placeholder:text-stone-400"
              />
            </div>
            <button
              type="button"
              onClick={() => handleAgregar()}
              disabled={isSaving || !nuevoNombre.trim()}
              className="px-5 py-2.5 rounded-xl bg-pink-700 hover:bg-pink-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Agregar Cajero'}</span>
            </button>
          </div>
          <p className="text-[11px] text-stone-400">
            Presiona <kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-600 font-mono text-[10px]">Enter</kbd> o haz clic en Agregar Cajero.
          </p>
        </div>
      )}

      {/* Buscador rápido si hay más de 3 cajeros */}
      {cajeros.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cajero por nombre..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>
      )}

      {/* Lista de Cajeros */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-stone-600 px-1">
          <span>Lista de Personal Autorizado</span>
          <span className="text-[11px] font-normal text-stone-400">
            {cajerosFiltrados.length} en pantalla
          </span>
        </div>

        {cajerosFiltrados.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-stone-50 border border-dashed border-stone-200 space-y-2">
            <Users className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-semibold text-stone-600">
              {busqueda
                ? `No se encontró ningún cajero que coincida con "${busqueda}".`
                : 'Aún no hay cajeros registrados en el sistema.'}
            </p>
            <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
              Utiliza el campo de arriba para escribir el nombre de la persona responsable de caja y agrégala.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cajerosFiltrados.map((nombre, idx) => {
              const gradient = avatarGradients[idx % avatarGradients.length];
              return (
                <div
                  key={`${nombre}-${idx}`}
                  className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-pink-200 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}
                    >
                      {getIniciales(nombre)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                        {nombre}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <UserCheck className="w-3 h-3" />
                        <span>Habilitado en Caja</span>
                      </span>
                    </div>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setCajeroAEliminar(nombre)}
                      className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title={`Eliminar a ${nombre}`}
                      aria-label={`Eliminar cajero ${nombre}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
        <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-[11px] leading-relaxed">
          <p className="font-bold text-amber-950">
            ¿Dónde se utilizan estos nombres?
          </p>
          <p className="text-amber-800">
            1. En la <strong>pantalla de inicio de sesión</strong> de la Terminal de Cajero para seleccionar quién abre el turno.
          </p>
          <p className="text-amber-800">
            2. En el <strong>punto de venta (POS)</strong> al realizar un cambio de cajero de jornada.
          </p>
          <p className="text-amber-800">
            3. En los <strong>tickets y comprobantes</strong> impresos para auditoría de ventas.
          </p>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      {cajeroAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full p-6 rounded-2xl shadow-xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-serif font-bold text-stone-900 text-base">
                ¿Eliminar cajero?
              </h4>
              <p className="text-xs text-stone-600">
                ¿Estás seguro de que deseas eliminar a{' '}
                <strong className="text-stone-900">{cajeroAEliminar}</strong> del personal de caja?
              </p>
              <p className="text-[11px] text-stone-400 mt-2">
                Ya no aparecerá en el selector de turnos para el punto de venta.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCajeroAEliminar(null)}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isSaving ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
