import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  UserCheck,
  Key,
  ShieldCheck,
  Mail,
  Lock,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Usuario, RoleType, ConfiguracionNegocio } from '../../types';
import { usuariosService, normalizeRole, getRoleDisplayName } from '../../services/usuariosService';
import { configuracionService } from '../../services/configuracionService';
import { formatFechaCorta } from '../../utils/formatters';
import { CajerosManager } from './CajerosManager';

interface UsuariosViewProps {
  usuarios: Usuario[];
  config?: ConfiguracionNegocio;
  onRefreshData?: () => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  config,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'cajeros' | 'cuentas'>('cajeros');
  const [editingUser, setEditingUser] = useState<Partial<Usuario> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenNew = () => {
    setEditingUser({
      nombre: '',
      email: '',
      rol: 'cajero',
      activo: true,
    });
    setPassword('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: Usuario) => {
    setEditingUser({ ...user });
    setPassword('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.nombre || !editingUser.email) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (editingUser.id) {
        await usuariosService.actualizarUsuario(editingUser.id, {
          nombre: editingUser.nombre,
          email: editingUser.email,
          rol: normalizeRole(editingUser.rol),
          activo: editingUser.activo !== false,
        });
        setFeedback('Usuario actualizado con éxito y sincronizado en Firestore.');
      } else {
        await usuariosService.crearUsuario({
          nombre: editingUser.nombre,
          email: editingUser.email,
          rol: normalizeRole(editingUser.rol),
          activo: editingUser.activo !== false,
        });
        setFeedback('Usuario creado con éxito y guardado en Firestore.');
      }
      setIsModalOpen(false);
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error saving user:', err);
      setErrorMsg(err.message || 'Error al guardar usuario en Firestore');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('¿Seguro que deseas eliminar este usuario del sistema?')) return;
    setErrorMsg(null);
    try {
      await usuariosService.eliminarUsuario(id);
      setFeedback('Usuario eliminado de Firestore con éxito.');
      onRefreshData?.();
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setErrorMsg(err.message || 'Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-amber-600" />
            <span>Usuarios y Personal de Caja</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Gestión del personal autorizado en caja y credenciales de acceso al sistema.
          </p>
        </div>

        {activeTab === 'cuentas' && (
          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        )}
      </div>

      {/* Selector de pestañas */}
      <div className="flex border-b border-stone-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('cajeros')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'cajeros'
              ? 'border-pink-600 text-pink-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Personal de Cajeros</span>
          {config?.cajerosPredefinidos && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 font-bold">
              {config.cajerosPredefinidos.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cuentas')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'cuentas'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Cuentas de Acceso (Login)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
            {usuarios.length}
          </span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="flex-1">
            <p>{errorMsg}</p>
            {errorMsg.includes('permission-denied') && (
              <p className="text-[11px] text-rose-700 font-normal mt-0.5">
                Tip: Las Reglas de Seguridad en Firebase Console están bloqueando la escritura. Ve a <strong>Configuración del Negocio</strong> para copiar las reglas recomendadas y aplicarlas en tu consola de Firebase.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cajeros' ? (
        <CajerosManager
          cajeros={config?.cajerosPredefinidos || []}
          onSaveCajeros={async (nuevaLista) => {
            await configuracionService.updateConfiguracion({ cajerosPredefinidos: nuevaLista });
            if (onRefreshData) onRefreshData();
          }}
        />
      ) : (
        <>
          {/* Role explanation cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Rol: Administrador (admin)</span>
              </div>
              <p className="text-xs text-amber-800/80 mt-1">
                Acceso irrestricto total: Dashboard ejecutivo, Punto de venta, Control de inventario, Gestión de productos y precios, Registro de producción diaria, Categorías, Usuarios y Configuración del negocio.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <UserCheck className="w-4 h-4 text-blue-700" />
                <span>Rol: Cajero (cajero)</span>
              </div>
              <p className="text-xs text-blue-800/80 mt-1">
                Acceso operativo enfocado: Dashboard ejecutivo, Terminal de ventas / Cobro en caja (POS) y Consulta / ajustes rápidos de inventario. Pestañas de configuración y edición de precios ocultas.
              </p>
            </div>
          </div>

          {/* Users table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        {/* Mobile View (under md breakpoint) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {usuarios.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              No hay usuarios registrados.
            </div>
          ) : (
            usuarios.map((u, idx) => {
              const normalized = normalizeRole(u.rol);
              const isAdm = normalized === 'admin';
              return (
                <div key={u.id ? `mob-u-${u.id}-${idx}` : `mob-u-${idx}`} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">{u.nombre}</h4>
                      <span className="text-xs text-stone-500 block">{u.email}</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                        isAdm
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}
                    >
                      {getRoleDisplayName(normalized)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.activo !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.activo !== false ? 'Activo' : 'Suspendido'}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {formatFechaCorta(u.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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
                <th className="p-3.5">Nombre</th>
                <th className="p-3.5">Correo Electrónico</th>
                <th className="p-3.5">Rol Asignado</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5">Fecha Creación</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {usuarios.map((u, idx) => {
                const normalized = normalizeRole(u.rol);
                const isAdm = normalized === 'admin';
                return (
                  <tr key={u.id ? `${u.id}-${idx}` : `user-${idx}`} className="hover:bg-stone-50/50">
                    <td className="p-3.5 font-bold text-stone-900">
                      {u.nombre}
                    </td>
                    <td className="p-3.5 text-stone-600">{u.email}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isAdm
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        {getRoleDisplayName(normalized)}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.activo !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.activo !== false ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="p-3.5 text-stone-400">
                      {formatFechaCorta(u.createdAt)}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-amber-900 hover:bg-amber-50 cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Modal Usuario */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-stone-900 text-base">
                {editingUser.id ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María Pérez"
                  value={editingUser.nombre || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@deliciasbelgi.com"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  Rol del Sistema *
                </label>
                <select
                  value={normalizeRole(editingUser.rol)}
                  onChange={(e) => setEditingUser({ ...editingUser, rol: e.target.value as RoleType })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white font-semibold"
                >
                  <option value="admin">Administrador (Acceso Total)</option>
                  <option value="cajero">Cajero (Ventas, POS e Inventario)</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={editingUser.activo !== false}
                    onChange={(e) => setEditingUser({ ...editingUser, activo: e.target.checked })}
                    className="rounded text-amber-900 focus:ring-amber-900"
                  />
                  <span>Usuario Activo en el Sistema</span>
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {loading ? 'Guardando...' : 'Guardar Usuario'}
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
    </div>
  );
};
