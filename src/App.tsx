import React, { useState, useEffect } from 'react';
import {
  Producto,
  Categoria,
  ConfiguracionNegocio,
  Venta,
  MovimientoInventario,
  ProduccionRegistro,
  Usuario,
  UserAuth,
  CartItem,
  AdminTab,
  Promocion,
} from './types';
import { deduplicateById } from './utils/deduplicate';

// Services
import { productosService } from './services/productosService';
import { categoriasService } from './services/categoriasService';
import { configuracionService } from './services/configuracionService';
import { ventasService } from './services/ventasService';
import { inventarioService } from './services/inventarioService';
import { produccionService } from './services/produccionService';
import { promocionesService } from './services/promocionesService';
import { usuariosService, normalizeRole } from './services/usuariosService';
import { authService } from './services/authService';
import { DEFAULT_CONFIGURACION } from './services/initialData';

// Public Components
import { PublicPage } from './components/public/PublicPage';

// Admin Components
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './components/admin/AdminLogin';
import { DashboardView } from './components/admin/DashboardView';
import { VentasView } from './components/admin/VentasView';
import { ProductosView } from './components/admin/ProductosView';
import { PromocionesView } from './components/admin/PromocionesView';
import { InventarioView } from './components/admin/InventarioView';
import { ProduccionView } from './components/admin/ProduccionView';
import { CategoriasView } from './components/admin/CategoriasView';
import { UsuariosView } from './components/admin/UsuariosView';
import { ConfiguracionView } from './components/admin/ConfiguracionView';

type ViewScreen = 'public' | 'admin_login' | 'admin';

export default function App() {
  // Screen state
  const [screen, setScreen] = useState<ViewScreen>('public');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserAuth | null>(null);

  // Data states
  const [productos, setProductos] = useState<Producto[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [config, setConfig] = useState<ConfiguracionNegocio>(DEFAULT_CONFIGURACION);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [producciones, setProducciones] = useState<ProduccionRegistro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Cart state for public storefront
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('delicias_belgi_cart');
      if (saved) {
        const parsed: CartItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter((item) => {
            const pid = item?.producto?.id;
            if (!pid || seen.has(pid)) return false;
            seen.add(pid);
            return true;
          });
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('delicias_belgi_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Error saving cart:', e);
    }
  }, [cart]);

  // Auth listener
  useEffect(() => {
    const unsub = authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Public Data Subscriptions (Products, Categories, Store Config)
  useEffect(() => {
    const unsubProductos = productosService.subscribeToProductos((items) => {
      const dedup = deduplicateById(items);
      setProductos(dedup);
      setLoadingProductos(false);
    });

    const unsubCategorias = categoriasService.subscribeToCategorias((cats) => {
      const dedup = deduplicateById(cats);
      setCategorias(dedup);
    });

    const unsubPromociones = promocionesService.subscribeToPromociones((promos) => {
      const dedup = deduplicateById(promos);
      setPromociones(dedup);
    });

    const unsubConfig = configuracionService.subscribeToConfiguracion((cfg) => {
      setConfig(cfg);
    });

    return () => {
      unsubProductos();
      unsubCategorias();
      unsubPromociones();
      unsubConfig();
    };
  }, []);

  // Protected Admin Subscriptions: Only active when an authenticated staff/admin is logged in
  useEffect(() => {
    if (!currentUser) return;

    const unsubVentas = ventasService.subscribeToVentas((sales) => {
      setVentas(deduplicateById(sales));
    });

    const unsubInventario = inventarioService.subscribeToMovimientos((movs) => {
      setMovimientos(deduplicateById(movs));
    });

    const unsubProduccion = produccionService.subscribeToProducciones((prods) => {
      setProducciones(deduplicateById(prods));
    });

    const unsubUsuarios = usuariosService.subscribeToUsuarios((users) => {
      setUsuarios(deduplicateById(users));
    });

    return () => {
      unsubVentas();
      unsubInventario();
      unsubProduccion();
      unsubUsuarios();
    };
  }, [currentUser]);

  // Public Cart Handlers
  const handleAddToCart = (producto: Producto) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      if (existing) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.producto.id === productId ? { ...item, cantidad: quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.producto.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Navigation handlers
  const handleGoToAdmin = () => {
    if (currentUser) {
      setScreen('admin');
    } else {
      setScreen('admin_login');
    }
  };

  const handleBackToPublic = () => {
    setScreen('public');
  };

  const handleLoginSuccess = (user: UserAuth) => {
    setCurrentUser(user);
    setScreen('admin');
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setScreen('public');
  };

  // Permissions validation
  const userRole = currentUser ? normalizeRole(currentUser.role) : 'cajero';
  const isAdmin = userRole === 'admin';

  // Manual refresh trigger
  const handleRefreshData = async () => {
    try {
      const [allProds, allVentas, allProducciones, allCats, allPromos] = await Promise.all([
        productosService.getAllProductos(),
        ventasService.getVentas(),
        produccionService.getProducciones(),
        categoriasService.getCategorias(),
        promocionesService.getPromociones(),
      ]);
      setProductos(deduplicateById(allProds));
      setVentas(deduplicateById(allVentas));
      setProducciones(deduplicateById(allProducciones));
      setCategorias(deduplicateById(allCats));
      setPromociones(deduplicateById(allPromos));
    } catch (e) {
      console.warn('Error refreshing data:', e);
    }
  };

  // Force Cajero to allowed tabs
  const allowedCajeroTabs: AdminTab[] = ['dashboard', 'ventas', 'inventario', 'productos'];
  const effectiveTab: AdminTab = !isAdmin && !allowedCajeroTabs.includes(adminTab)
    ? 'ventas'
    : adminTab;

  return (
    <div className="font-sans antialiased text-stone-800 bg-[#faf7f2] min-h-screen selection:bg-amber-200 selection:text-amber-900">
      {/* 1. PUBLIC STOREFRONT VIEW */}
      {screen === 'public' && (
        <PublicPage
          productos={productos}
          promociones={promociones}
          loadingProductos={loadingProductos}
          config={config}
          cart={cart}
          onAddToCart={handleAddToCart}
          onUpdateCartQuantity={handleUpdateCartQuantity}
          onRemoveFromCart={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onGoToAdmin={handleGoToAdmin}
        />
      )}

      {/* 2. ADMIN LOGIN VIEW */}
      {screen === 'admin_login' && (
        <AdminLogin
          onLoginSuccess={handleLoginSuccess}
          onBackToPublic={handleBackToPublic}
        />
      )}

      {/* 3. ADMIN PANEL VIEW */}
      {screen === 'admin' && currentUser && (
        <AdminLayout
          currentTab={effectiveTab}
          onSelectTab={(tab) => setAdminTab(tab)}
          user={currentUser}
          config={config}
          onLogout={handleLogout}
          onBackToPublic={handleBackToPublic}
        >
          {effectiveTab === 'dashboard' && (
            <DashboardView
              ventas={ventas}
              productos={productos}
              producciones={producciones}
              onNavigateTab={(tab) => setAdminTab(tab)}
            />
          )}

          {effectiveTab === 'ventas' && (
            <VentasView
              ventas={ventas}
              productos={productos}
              user={currentUser}
              config={config}
              onRefreshData={handleRefreshData}
              onNavigateTab={(tab) => setAdminTab(tab)}
            />
          )}

          {effectiveTab === 'inventario' && (
            <InventarioView
              productos={productos}
              movimientos={movimientos}
              user={currentUser}
            />
          )}

          {/* Products view (Available to both Admin and Cajero) */}
          {effectiveTab === 'productos' && (
            <ProductosView
              productos={productos}
              categorias={categorias}
              config={config}
              user={currentUser}
              onRefreshData={handleRefreshData}
              onNavigateTab={(tab) => setAdminTab(tab)}
            />
          )}

          {/* Promociones & Ofertas (Admin only) */}
          {isAdmin && effectiveTab === 'promociones' && (
            <PromocionesView
              promociones={promociones}
              productos={productos}
              config={config}
              onRefreshData={handleRefreshData}
            />
          )}

          {isAdmin && effectiveTab === 'produccion' && (
            <ProduccionView
              producciones={producciones}
              productos={productos}
              user={currentUser}
              onRefreshData={handleRefreshData}
            />
          )}

          {isAdmin && effectiveTab === 'categorias' && (
            <CategoriasView
              categorias={categorias}
              onRefreshData={handleRefreshData}
            />
          )}

          {isAdmin && effectiveTab === 'usuarios' && (
            <UsuariosView
              usuarios={usuarios}
              config={config}
              onRefreshData={handleRefreshData}
            />
          )}

          {isAdmin && effectiveTab === 'configuracion' && (
            <ConfiguracionView
              config={config}
              productos={productos}
              onRefreshData={handleRefreshData}
            />
          )}
        </AdminLayout>
      )}
    </div>
  );
}
