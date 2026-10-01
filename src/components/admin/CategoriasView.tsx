import React, { useState } from 'react';
import { FolderTree, Plus, Edit2, Trash2, Check, X, Tag, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { Categoria } from '../../types';
import { categoriasService } from '../../services/categoriasService';

interface CategoriasViewProps {
  categorias: Categoria[];
  onRefreshData?: () => void;
}

export const CategoriasView: React.FC<CategoriasViewProps> = ({
  categorias,
  onRefreshData,
}) => {
  const [editingCat, setEditingCat] = useState<Partial<Categoria> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal de confirmación para eliminar
  const [categoryToDelete, setCategoryToDelete] = useState<Categoria | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [syncingFirestore, setSyncingFirestore] = useState(false);

  const handleSyncFirestore = async () => {
    setSyncingFirestore(true);
    try {
      await categoriasService.sincronizarCategoriasConFirestore(categorias);
      setFeedback(`✓ ${categorias.length} categorías sincronizadas correctamente en Firestore.`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: any) {
      setErrorMessage('Error al sincronizar con Firestore: ' + (e?.message || e));
    } finally {
      setSyncingFirestore(false);
    }
  };

  const handleOpenNew = () => {
    setErrorMessage(null);
    setEditingCat({
      nombre: '',
      descripcion: '',
      orden: categorias.length + 1,
      activa: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Categoria) => {
    setErrorMessage(null);
    setEditingCat({ ...cat });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.nombre?.trim()) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      if (editingCat.id) {
        await categoriasService.actualizarCategoria(editingCat.id, editingCat);
        setFeedback(`Categoría "${editingCat.nombre.trim()}" actualizada con éxito.`);
      } else {
        await categoriasService.crearCategoria(editingCat as any);
        setFeedback(`Categoría "${editingCat.nombre.trim()}" creada con éxito.`);
      }
      setIsModalOpen(false);
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete?.id) return;
    setDeletingLoading(true);
    setErrorMessage(null);

    try {
      const catName = categoryToDelete.nombre;
      const res = await categoriasService.eliminarCategoria(categoryToDelete.id);
      setCategoryToDelete(null);
      setFeedback(
        res.deletedInFirebase
          ? `Categoría "${catName}" eliminada correctamente de Firebase y del menú.`
          : `Categoría "${catName}" eliminada correctamente.`
      );
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al eliminar la categoría');
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-amber-600" />
            <span>Categorías del Menú</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Organiza las secciones del menú digital y del catálogo del punto de venta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sincronizado con Firestore</span>
          </span>

          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Categoría</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-stone-400 hover:text-stone-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {categorias.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-white border border-dashed border-stone-300">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-900 flex items-center justify-center mx-auto mb-3">
            <FolderTree className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-stone-800 text-base">
            No hay categorías registradas
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
            Crea una nueva categoría para clasificar tus productos de repostería y dulcería.
          </p>
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Categoría</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map((cat, idx) => (
            <div
              key={cat.id ? `${cat.id}-${idx}` : `cat-${idx}`}
              className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Tag className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                    Orden #{cat.orden ?? idx + 1}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-stone-900 text-base mt-3">
                  {cat.nombre}
                </h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                  {cat.descripcion || 'Sin descripción'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cat.activa !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {cat.activa !== false ? 'Activa' : 'Inactiva'}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-amber-900 hover:bg-amber-50 cursor-pointer"
                    title="Editar categoría"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCategoryToDelete(cat)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Eliminar categoría"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Creación / Edición */}
      {isModalOpen && editingCat && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-stone-900 text-base">
                {editingCat.id ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Repostería, Dulcería, Tartas..."
                  value={editingCat.nombre || ''}
                  onChange={(e) => setEditingCat({ ...editingCat, nombre: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Breve detalle sobre los productos incluidos..."
                  value={editingCat.descripcion || ''}
                  onChange={(e) => setEditingCat({ ...editingCat, descripcion: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingCat.orden ?? 1}
                  onChange={(e) => setEditingCat({ ...editingCat, orden: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              <div className="pt-2 flex gap-2">
                {editingCat.id && (
                  <button
                    type="button"
                    onClick={() => {
                      const found = categorias.find((c) => c.id === editingCat.id);
                      if (found) {
                        setIsModalOpen(false);
                        setCategoryToDelete(found);
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                    title="Eliminar esta categoría"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
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

      {/* Modal Confirmar Eliminación de Categoría */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-rose-700">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Eliminar Categoría
                </h3>
              </div>
              <button
                onClick={() => !deletingLoading && setCategoryToDelete(null)}
                disabled={deletingLoading}
                className="text-stone-400 hover:text-stone-600 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
              <h4 className="font-bold text-stone-900 text-sm">
                {categoryToDelete.nombre}
              </h4>
              <p className="text-xs text-stone-500">
                {categoryToDelete.descripcion || 'Sin descripción'}
              </p>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              ¿Estás seguro de que deseas eliminar esta categoría? Se eliminará de <strong>Firebase</strong> y del menú de la tienda. Los productos no se borrarán, pero dejarán de mostrarse bajo esta categoría.
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deletingLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Definitivamente</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={deletingLoading}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
