import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Producto, Categoria, ConfiguracionNegocio, UserAuth, AdminTab } from '../../types';
import { productosService } from '../../services/productosService';
import { formatCurrency } from '../../utils/formatters';
import { ImageUploadInput } from '../common/ImageUploadInput';

interface ProductosViewProps {
  productos: Producto[];
  categorias: Categoria[];
  config?: ConfiguracionNegocio;
  user?: UserAuth;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: AdminTab) => void;
}

export const ProductosView: React.FC<ProductosViewProps> = ({
  productos,
  categorias,
  config,
  user,
  onRefreshData,
  onNavigateTab,
}) => {
  const canRegisterProducts = config?.permitirAdminRegistrarProductos !== false;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('Todas');
  const [editingProducto, setEditingProducto] = useState<Partial<Producto> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [clearingAllLoading, setClearingAllLoading] = useState(false);

  const categoryNames = useMemo(() => {
    const fromList = categorias.map((c) => c.nombre);
    const fromProds = productos.map((p) => p.categoria);
    return ['Todas', ...Array.from(new Set([...fromList, ...fromProds]))];
  }, [categorias, productos]);

  const filtered = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = selectedCat === 'Todas' || p.categoria === selectedCat;
      const matchSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [productos, selectedCat, searchQuery]);

  const handleOpenNew = () => {
    setEditingProducto({
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: categorias[0]?.nombre || 'Dulcería',
      stock: 0,
      stockMinimo: 0,
      disponible: true,
      destacado: false,
      imagen: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Producto) => {
    setEditingProducto({ ...prod });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProducto || !editingProducto.nombre) return;
    setLoading(true);

    try {
      if (editingProducto.id) {
        await productosService.actualizarProducto(editingProducto.id, editingProducto);
        setFeedback('Producto actualizado exitosamente.');
      } else {
        await productosService.crearProducto(editingProducto as any);
        setFeedback('Producto creado exitosamente.');
      }
      setIsModalOpen(false);
      setEditingProducto(null);
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete?.id) return;
    setDeletingLoading(true);
    try {
      const res = await productosService.eliminarProducto(productToDelete.id);
      const prodName = productToDelete.nombre;
      setProductToDelete(null);
      setFeedback(
        res.deletedInFirebase
          ? `Producto "${prodName}" eliminado correctamente de Firebase y del catálogo.`
          : `Producto "${prodName}" eliminado del catálogo.`
      );
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      setFeedback('Error al eliminar: ' + (err.message || 'Error desconocido'));
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleClearAll = async () => {
    setClearingAllLoading(true);
    try {
      await productosService.eliminarTodosLosProductos();
      setIsClearAllModalOpen(false);
      setFeedback('Catálogo vaciado con éxito. Ya puedes empezar a ingresar tus propios productos.');
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      setFeedback('Error al vaciar catálogo: ' + (err.message || 'Error'));
    } finally {
      setClearingAllLoading(false);
    }
  };

  const handleToggleDisponible = async (prod: Producto) => {
    if (!prod.id) return;
    try {
      await productosService.actualizarProducto(prod.id, { disponible: !prod.disponible });
      onRefreshData?.();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-pink-600" />
            <span>Gestión de Productos</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Supervisa precios, descripciones, stock e imágenes del catálogo de Dulzuras de Belgi's.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {productos.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Eliminar todos los productos para empezar desde cero con los tuyos"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Vaciar Catálogo</span>
            </button>
          )}

          <button
            id="btn-new-product"
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Guide Banner: How to put your products */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-amber-50/50 to-pink-50 border border-pink-200 text-xs text-stone-700 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-pink-600 text-white shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-stone-900 text-sm mb-0.5">
              ¿Cómo agregar tus propios productos?
            </h4>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              1. Haz clic en el botón rosa <strong>"+ Nuevo Producto"</strong>.<br />
              2. Ingresa el nombre de tu dulce, precio, categoría y sube la foto desde tu dispositivo.<br />
              3. Presiona <strong>"Guardar"</strong> y aparecerá de inmediato en la tienda pública y en la caja de cobro.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="self-start md:self-center px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
        >
          + Agregar Producto Ahora
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            feedback.startsWith('Error')
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.startsWith('Error') ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar producto por nombre o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categoryNames.map((cat, idx) => (
            <button
              key={`${cat}-${idx}`}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCat === cat
                  ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        {/* Mobile Cards (under md breakpoint) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              {productos.length === 0 ? 'Catálogo completamente vacío' : 'No se encontraron productos'}
            </div>
          ) : (
            filtered.map((prod, idx) => (
              <div key={prod.id ? `mob-prod-item-${prod.id}-${idx}` : `mob-prod-item-${idx}`} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={prod.imagen}
                    alt={prod.nombre}
                    className="w-14 h-14 rounded-xl object-cover bg-stone-100 border border-stone-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-serif font-bold text-stone-900 text-sm truncate">
                        {prod.nombre}
                      </h4>
                      <span className="font-serif font-extrabold text-amber-950 text-sm whitespace-nowrap">
                        {formatCurrency(prod.precio)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-medium">
                        {prod.categoria}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          (prod.stock ?? 0) <= 0
                            ? 'text-rose-600'
                            : (prod.stock ?? 0) <= (prod.stockMinimo ?? 5)
                            ? 'text-amber-600'
                            : 'text-stone-600'
                        }`}
                      >
                        Stock: {prod.stock ?? 0} uds.
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 line-clamp-1 mt-1">
                      {prod.descripcion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <button
                    onClick={() => handleToggleDisponible(prod)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                      prod.disponible !== false
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {prod.disponible !== false ? (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Visible en tienda</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Oculto</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setProductToDelete(prod)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Producto</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Precio</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
                        <Plus className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif font-bold text-base text-stone-900">
                        {productos.length === 0 ? 'Catálogo completamente vacío' : 'No se encontraron productos'}
                      </h4>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        {productos.length === 0
                          ? 'Aún no has registrado ningún producto. Empieza desde cero creando tu primer producto artesanal. Se guardará en Firebase Firestore y se sincronizará en la web para todos tus dispositivos.'
                          : 'No hay productos que coincidan con los filtros o término de búsqueda.'}
                      </p>
                      {productos.length === 0 && (
                        <button
                          type="button"
                          onClick={handleOpenNew}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Crear mi primer producto</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((prod, idx) => (
                  <tr key={prod.id ? `${prod.id}-${idx}` : `prod-${idx}`} className="hover:bg-stone-50/50">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.imagen}
                          alt={prod.nombre}
                          className="w-10 h-10 rounded-xl object-cover bg-stone-100 border border-stone-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-serif font-bold text-stone-900 truncate">
                            {prod.nombre}
                          </h4>
                          <p className="text-[11px] text-stone-400 truncate max-w-xs">
                            {prod.descripcion}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium">
                        {prod.categoria}
                      </span>
                    </td>
                    <td className="p-3.5 font-serif font-bold text-amber-950 text-sm">
                      {formatCurrency(prod.precio)}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`font-semibold ${
                          (prod.stock ?? 0) <= 0
                            ? 'text-rose-600'
                            : (prod.stock ?? 0) <= (prod.stockMinimo ?? 5)
                            ? 'text-amber-600'
                            : 'text-stone-700'
                        }`}
                      >
                        {prod.stock ?? 0} uds.
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleDisponible(prod)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                          prod.disponible !== false
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title="Clic para cambiar disponibilidad"
                      >
                        {prod.disponible !== false ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Oculto</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-amber-900 hover:bg-amber-50 cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setProductToDelete(prod)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Creación / Edición */}
      {isModalOpen && editingProducto && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-stone-900 text-lg">
                {editingProducto.id ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Alfajor Artesanal de Chocolate"
                  value={editingProducto.nombre || ''}
                  onChange={(e) => setEditingProducto({ ...editingProducto, nombre: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Descripción *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detalles sobre ingredientes, textura, presentación..."
                  value={editingProducto.descripcion || ''}
                  onChange={(e) => setEditingProducto({ ...editingProducto, descripcion: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Precio ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingProducto.precio ?? 0}
                    onChange={(e) => setEditingProducto({ ...editingProducto, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Categoría *
                  </label>
                  <select
                    value={editingProducto.categoria || 'Dulcería'}
                    onChange={(e) => setEditingProducto({ ...editingProducto, categoria: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  >
                    {categoryNames.filter((c) => c !== 'Todas').map((c, idx) => (
                      <option key={`${c}-${idx}`} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Stock Actual (uds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProducto.stock ?? 0}
                    onChange={(e) => setEditingProducto({ ...editingProducto, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                    Stock Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProducto.stockMinimo ?? 5}
                    onChange={(e) => setEditingProducto({ ...editingProducto, stockMinimo: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>
              </div>

              <div>
                <ImageUploadInput
                  label="Fotografía del Producto *"
                  value={editingProducto.imagen || ''}
                  onChange={(val) => setEditingProducto({ ...editingProducto, imagen: val })}
                  placeholder="https://images.unsplash.com/... o sube desde tu equipo"
                  helperText="Puedes subir una foto desde tu equipo o pegar una URL."
                  previewHeight="h-28"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={editingProducto.disponible !== false}
                    onChange={(e) => setEditingProducto({ ...editingProducto, disponible: e.target.checked })}
                    className="rounded text-amber-900 focus:ring-amber-900"
                  />
                  <span>Producto disponible para la venta</span>
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                {editingProducto.id && (
                  <button
                    type="button"
                    onClick={() => {
                      const found = productos.find((p) => p.id === editingProducto.id);
                      if (found) {
                        setIsModalOpen(false);
                        setProductToDelete(found);
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                    title="Eliminar este producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Guardar Producto</span>
                  )}
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

      {/* Modal Confirmar Eliminación */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-rose-700">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Eliminar Producto
                </h3>
              </div>
              <button
                onClick={() => !deletingLoading && setProductToDelete(null)}
                disabled={deletingLoading}
                className="text-stone-400 hover:text-stone-600 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
              <img
                src={productToDelete.imagen}
                alt={productToDelete.nombre}
                className="w-14 h-14 rounded-lg object-cover border border-stone-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-stone-900 text-sm truncate">
                  {productToDelete.nombre}
                </h4>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-700 font-medium text-[10px]">
                    {productToDelete.categoria}
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-stone-800">
                    {formatCurrency(productToDelete.precio)}
                  </span>
                  <span>·</span>
                  <span>Stock: {productToDelete.stock ?? 0}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              ¿Estás seguro de que deseas eliminar este producto? Se eliminará de la base de datos en <strong>Firebase</strong> y dejará de estar disponible en el inventario, punto de venta y catálogo de la tienda.
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
                onClick={() => setProductToDelete(null)}
                disabled={deletingLoading}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION MODAL */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">¿Vaciar Todo el Catálogo?</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Esta acción eliminará todos los productos actuales ({productos.length}) para que puedas empezar a cargar los tuyos propios desde cero.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearingAllLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
              >
                {clearingAllLoading ? 'Vaciando...' : 'Sí, Vaciar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
