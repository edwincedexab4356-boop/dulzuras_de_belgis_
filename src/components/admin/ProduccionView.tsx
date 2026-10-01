import React, { useState, useMemo } from 'react';
import {
  Factory,
  Plus,
  Minus,
  Calendar,
  Check,
  X,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { ProduccionRegistro, Producto, UserAuth } from '../../types';
import { produccionService } from '../../services/produccionService';
import { formatFechaCorta, getPanamaTodayYMD } from '../../utils/formatters';

interface ProduccionViewProps {
  producciones: ProduccionRegistro[];
  productos: Producto[];
  user: UserAuth;
  onRefreshData?: () => void;
}

export const ProduccionView: React.FC<ProduccionViewProps> = ({
  producciones,
  productos,
  user,
  onRefreshData,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductoId, setSelectedProductoId] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(12);
  const [tipoOperacion, setTipoOperacion] = useState<'produccion' | 'baja'>('produccion');
  const [lote, setLote] = useState<string>(() => `LOTE-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`);
  const [responsable, setResponsable] = useState<string>(user.displayName || user.email || 'Maestro Repostero');
  const [observaciones, setObservaciones] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Security modals (code 0000)
  const [recordToDelete, setRecordToDelete] = useState<ProduccionRegistro | null>(null);
  const [codeDelete, setCodeDelete] = useState('');
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [codeClearAll, setCodeClearAll] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Daily totals
  const todayStr = getPanamaTodayYMD();
  const stats = useMemo(() => {
    let totalHoy = 0;
    let totalHistorico = 0;
    producciones.forEach((p) => {
      const qty = Number(p.cantidad) || 0;
      const isBaja = (p as any).esBaja === true || (p as any).tipoOperacion === 'baja';
      if (!isBaja) {
        totalHistorico += qty;
        if (p.fecha.startsWith(todayStr)) {
          totalHoy += qty;
        }
      }
    });
    return { totalHoy, totalHistorico };
  }, [producciones, todayStr]);

  const handleOpenModal = (tipo: 'produccion' | 'baja' = 'produccion') => {
    setSelectedProductoId(productos[0]?.id || '');
    setCantidad(12);
    setTipoOperacion(tipo);
    setLote(`LOTE-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`);
    setObservaciones('');
    setIsModalOpen(true);
  };

  const handleSaveProduccion = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = productos.find((p) => p.id === selectedProductoId);
    if (!prod || cantidad <= 0) return;
    setLoading(true);

    try {
      const isBaja = tipoOperacion === 'baja';
      await produccionService.registrarProduccion({
        productoId: prod.id || '',
        producto: prod.nombre,
        cantidad,
        fecha: new Date().toISOString().split('T')[0],
        lote: lote.trim() || undefined,
        responsable: responsable.trim() || undefined,
        observacion: observaciones.trim() || undefined,
        esBaja: isBaja,
        tipoOperacion,
      });

      if (isBaja) {
        setSuccessMsg(`Baja de ${cantidad} unidades de "${prod.nombre}" registrada. Stock descontado en Firebase.`);
      } else {
        setSuccessMsg(`Lote de ${cantidad} unidades de "${prod.nombre}" registrado y sumado al stock en Firebase.`);
      }
      setIsModalOpen(false);
      onRefreshData?.();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Error al registrar lote: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete production record with security code 0000
  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToDelete) return;
    if (codeDelete !== '0000') {
      setCodeError('Código de seguridad incorrecto. El código requerido es 0000.');
      return;
    }

    setLoading(true);
    try {
      const prod = productos.find(
        (p) =>
          p.id === recordToDelete.productoId ||
          p.nombre.toLowerCase().trim() === recordToDelete.producto.toLowerCase().trim()
      );
      await produccionService.eliminarProduccion(
        recordToDelete,
        prod,
        user.displayName || user.email || 'Admin'
      );
      setSuccessMsg(`Lote de producción de "${recordToDelete.producto}" eliminado de Firebase y stock revertido.`);
      setRecordToDelete(null);
      setCodeDelete('');
      setCodeError(null);
      onRefreshData?.();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert('Error al eliminar producción: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear all production records with security code 0000
  const handleConfirmClearAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeClearAll !== '0000') {
      setCodeError('Código de seguridad incorrecto. El código requerido es 0000.');
      return;
    }

    setLoading(true);
    try {
      await produccionService.clearAllProducciones();
      setSuccessMsg('Historial de producción vaciado por completo en Firebase.');
      setIsClearAllModalOpen(false);
      setCodeClearAll('');
      setCodeError(null);
      onRefreshData?.();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert('Error al vaciar producciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return producciones.filter((p) =>
      p.producto.toLowerCase().includes(search.toLowerCase()) ||
      (p.lote || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.responsable || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [producciones, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Factory className="w-7 h-7 text-amber-600" />
            <span>Control de Producción Diaria</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Registro artesanal de lotes y mermas con sincronización de existencias en Firebase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {producciones.length > 0 && (
            <button
              onClick={() => {
                setIsClearAllModalOpen(true);
                setCodeClearAll('');
                setCodeError(null);
              }}
              className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Vaciar Historial</span>
            </button>
          )}

          <button
            id="btn-register-reduction"
            onClick={() => handleOpenModal('baja')}
            className="px-3.5 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Quitar stock desde la producción (merma o baja de cocina)"
          >
            <Minus className="w-4 h-4 text-rose-700" />
            <span>- Quitar Stock (Baja)</span>
          </button>

          <button
            id="btn-register-production"
            onClick={() => handleOpenModal('produccion')}
            className="px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Entrada de Lote</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
            Elaborado Hoy
          </span>
          <strong className="font-serif text-2xl sm:text-3xl font-bold text-amber-900 block mt-1">
            {stats.totalHoy} uds.
          </strong>
          <span className="text-[10px] text-stone-500 block mt-0.5">Producción del día</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
            Total Registros
          </span>
          <strong className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 block mt-1">
            {producciones.length} lotes
          </strong>
          <span className="text-[10px] text-stone-500 block mt-0.5">Historial en Firebase</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
            Unidades Totales
          </span>
          <strong className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 block mt-1">
            {stats.totalHistorico} uds.
          </strong>
          <span className="text-[10px] text-stone-500 block mt-0.5">Producción acumulada</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-900 block tracking-wider">
              Control Bidireccional
            </span>
            <span className="text-xs text-amber-800 font-semibold leading-tight block">
              Suma o descuenta stock en tiempo real
            </span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por producto, lote o responsable..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
          />
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          {/* Mobile Card List (under md breakpoint) */}
          <div className="block md:hidden divide-y divide-stone-100">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs">
                No hay registros de producción que coincidan.
              </div>
            ) : (
              filtered.map((prodReg, idx) => {
                const isBaja = (prodReg as any).esBaja === true || (prodReg as any).tipoOperacion === 'baja';
                return (
                  <div key={prodReg.id ? `mob-prod-${prodReg.id}-${idx}` : `mob-prod-reg-${idx}`} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm">{prodReg.producto}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">
                            {prodReg.lote || 'SIN LOTE'}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {formatFechaCorta(prodReg.fecha)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {isBaja ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-xs">
                            <Minus className="w-3 h-3" />
                            <span>{prodReg.cantidad} uds. (Baja)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-xs">
                            <Plus className="w-3 h-3" />
                            <span>{prodReg.cantidad} uds. (Entrada)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded-xl flex items-center justify-between">
                      <span className="text-[11px] text-stone-500">
                        Resp: <strong className="text-stone-800">{prodReg.responsable || 'Equipo de cocina'}</strong>
                      </span>
                      <button
                        onClick={() => {
                          setRecordToDelete(prodReg);
                          setCodeDelete('');
                          setCodeError(null);
                        }}
                        className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    {(prodReg.observacion || prodReg.notas) && (
                      <p className="text-[11px] text-stone-500 italic pl-1">
                        "{prodReg.observacion || prodReg.notas}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Lote</th>
                  <th className="p-3.5">Producto Elaborado</th>
                  <th className="p-3.5">Operación / Cantidad</th>
                  <th className="p-3.5">Responsable</th>
                  <th className="p-3.5">Observaciones</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      No hay registros de producción que coincidan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((prodReg, idx) => {
                    const isBaja = (prodReg as any).esBaja === true || (prodReg as any).tipoOperacion === 'baja';
                    return (
                      <tr key={prodReg.id ? `${prodReg.id}-${idx}` : `prod-reg-${idx}`} className="hover:bg-stone-50/50">
                        <td className="p-3.5 whitespace-nowrap text-stone-400">
                          {formatFechaCorta(prodReg.fecha)}
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-[11px] font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                            {prodReg.lote || 'SIN LOTE'}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-stone-900">
                          {prodReg.producto}
                        </td>
                        <td className="p-3.5">
                          {isBaja ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                              <Minus className="w-3 h-3" />
                              <span>{prodReg.cantidad} uds. (Baja)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              <Plus className="w-3 h-3" />
                              <span>{prodReg.cantidad} uds. (Entrada)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-stone-700">
                          {prodReg.responsable || 'Equipo de cocina'}
                        </td>
                        <td className="p-3.5 text-stone-500 text-[11px]">
                          {prodReg.observacion || prodReg.notas || '-'}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setRecordToDelete(prodReg);
                              setCodeDelete('');
                              setCodeError(null);
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar lote de producción con código 0000"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nueva Producción o Baja */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-amber-800" />
                <h3 className="font-serif font-bold text-stone-900 text-lg">
                  {tipoOperacion === 'baja' ? 'Quitar del Stock (Baja / Merma)' : 'Registrar Lote de Producción'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduccion} className="space-y-3.5">
              {/* Operation type toggle */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Tipo de Acción
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoOperacion('produccion')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      tipoOperacion === 'produccion'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Entrada Lote Elaborado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoOperacion('baja')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      tipoOperacion === 'baja'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>- Quitar Stock (Baja Cocina)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Producto *
                </label>
                <select
                  required
                  value={selectedProductoId}
                  onChange={(e) => setSelectedProductoId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
                >
                  {productos.map((p, idx) => (
                    <option key={p.id ? `${p.id}-${idx}` : `p-${idx}`} value={p.id}>
                      {p.nombre} ({p.categoria}) — Stock actual: {p.stock ?? 0} uds.
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    {tipoOperacion === 'baja' ? 'Cantidad a Descontar *' : 'Cantidad Elaborada *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Código de Lote
                  </label>
                  <input
                    type="text"
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Responsable
                </label>
                <input
                  type="text"
                  placeholder="Nombre del maestro repostero o encargado"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  {tipoOperacion === 'baja' ? 'Motivo de la Baja o Merma' : 'Notas u Observaciones'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    tipoOperacion === 'baja'
                      ? 'Ej. Descarte por merma en horneado o prueba de calidad...'
                      : 'Ej. Lote de merengue horneado, consistencia y textura óptimas...'
                  }
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
                />
              </div>

              <div
                className={`p-3 rounded-xl border text-xs ${
                  tipoOperacion === 'baja'
                    ? 'bg-rose-50 border-rose-200 text-rose-900 font-medium'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                }`}
              >
                {tipoOperacion === 'baja' ? (
                  <span>
                    El stock de este producto se <strong>reducirá en {cantidad} unidades</strong> y se sincronizará inmediatamente en Firebase.
                  </span>
                ) : (
                  <span>
                    El stock de este producto se <strong>incrementará en +{cantidad} unidades</strong> y se sincronizará inmediatamente en Firebase.
                  </span>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer ${
                    tipoOperacion === 'baja'
                      ? 'bg-rose-700 hover:bg-rose-600'
                      : 'bg-amber-900 hover:bg-amber-800'
                  }`}
                >
                  {loading
                    ? 'Guardando...'
                    : tipoOperacion === 'baja'
                    ? 'Descontar del Stock'
                    : 'Registrar Lote (+)'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Modal: Delete Single Production Lot (Code 0000) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Eliminar Lote de Producción
                </h3>
                <span className="text-[11px] text-stone-500">
                  Se revertirá el stock y se borrará de Firebase
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Estás por eliminar el lote{' '}
              <strong className="text-stone-900">{recordToDelete.lote}</strong> de{' '}
              <strong className="text-stone-900">{recordToDelete.producto}</strong> (
              {recordToDelete.cantidad} uds.).
            </p>

            <form onSubmit={handleConfirmDelete} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span>Código de Seguridad (0000)</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  autoFocus
                  placeholder="0000"
                  value={codeDelete}
                  onChange={(e) => {
                    setCodeDelete(e.target.value);
                    setCodeError(null);
                  }}
                  className="w-full px-3 py-2 text-center tracking-widest text-lg font-mono rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                {codeError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {codeError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || codeDelete.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Eliminando...' : 'Confirmar y Eliminar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecordToDelete(null);
                    setCodeDelete('');
                    setCodeError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Modal: Clear All Productions (Code 0000) */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Vaciar Historial de Producción
                </h3>
                <span className="text-[11px] text-stone-500">
                  Acción permanente en Firebase
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Esta acción eliminará <strong className="text-rose-700">TODOS</strong> los{' '}
              {producciones.length} registros de lotes de producción en Firebase Firestore.
            </p>

            <form onSubmit={handleConfirmClearAll} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span>Ingresa el código 0000 para confirmar</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  autoFocus
                  placeholder="0000"
                  value={codeClearAll}
                  onChange={(e) => {
                    setCodeClearAll(e.target.value);
                    setCodeError(null);
                  }}
                  className="w-full px-3 py-2 text-center tracking-widest text-lg font-mono rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                {codeError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {codeError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || codeClearAll.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Vaciando...' : 'Vaciar Todo Ahora'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsClearAllModalOpen(false);
                    setCodeClearAll('');
                    setCodeError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
