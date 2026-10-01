import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  HelpCircle,
  BarChart3,
  CalendarRange,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Venta, MetodoPago } from '../../types';
import { formatCurrency, PANAMA_TIMEZONE } from '../../utils/formatters';

interface ResumenVentasViewProps {
  ventas: Venta[];
  moneda?: string;
  onVerHistorial?: () => void;
  onNuevoCobro?: () => void;
}

type PeriodFilter = 'todos' | 'dia' | 'semana' | 'mes';

interface ResumenDia {
  fechaKey: string; // YYYY-MM-DD
  fechaDate: Date;
  fechaTexto: string;
  diaSemana: string;
  esHoy: boolean;
  esAyer: boolean;
  cantidadVentas: number;
  totalDinero: number;
  ticketPromedio: number;
  articulosTotal: number;
  metodosPago: Record<string, { count: number; total: number }>;
  ventas: Venta[];
  topProductos: { nombre: string; cantidad: number; total: number }[];
}

interface ResumenSemana {
  semanaKey: string;
  fechaInicioStr: string;
  fechaFinStr: string;
  textoRango: string;
  numeroSemana: number;
  anio: number;
  cantidadVentas: number;
  totalDinero: number;
  promedioDiario: number;
  diasConVenta: number;
  dias: ResumenDia[];
}

interface ResumenMes {
  mesKey: string; // YYYY-MM
  mesNombre: string;
  anio: number;
  cantidadVentas: number;
  totalDinero: number;
  ticketPromedio: number;
  promedioDiario: number;
  diasConVenta: number;
  dias: ResumenDia[];
  topProductos: { nombre: string; cantidad: number; total: number }[];
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

function getSafeDate(venta: Venta): Date {
  if (venta.fecha && venta.fecha.includes('-')) {
    const parts = venta.fecha.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 12, 0, 0);
    }
  }
  if (venta.createdAt) {
    const parsed = new Date(venta.createdAt);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function formatDateKey(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: PANAMA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export const ResumenVentasView: React.FC<ResumenVentasViewProps> = ({
  ventas,
  moneda = 'USD',
  onVerHistorial,
  onNuevoCobro,
}) => {
  const [activeFilter, setActiveFilter] = useState<PeriodFilter>('dia');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [searchDate, setSearchDate] = useState('');

  // Only consider non-cancelled sales
  const validVentas = useMemo(() => {
    return ventas.filter((v) => !v.anulada);
  }, [ventas]);

  // Today reference
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const yesterdayKey = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return formatDateKey(y);
  }, []);

  // Compute daily summaries
  const resumenesPorDia: ResumenDia[] = useMemo(() => {
    const map = new Map<string, Venta[]>();

    validVentas.forEach((v) => {
      const d = getSafeDate(v);
      const key = formatDateKey(d);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(v);
    });

    const list: ResumenDia[] = [];

    map.forEach((dayVentas, key) => {
      const sampleDate = getSafeDate(dayVentas[0]);
      const dayOfWeek = DIAS_SEMANA[sampleDate.getDay()];
      const dayNum = sampleDate.getDate();
      const monthName = MESES[sampleDate.getMonth()];
      const year = sampleDate.getFullYear();

      const esHoy = key === todayKey;
      const esAyer = key === yesterdayKey;

      let fechaTexto = `${dayOfWeek}, ${dayNum} de ${monthName} de ${year}`;
      if (esHoy) fechaTexto = `Hoy · ${fechaTexto}`;
      else if (esAyer) fechaTexto = `Ayer · ${fechaTexto}`;

      let totalDinero = 0;
      let articulosTotal = 0;
      const metodos: Record<string, { count: number; total: number }> = {};
      const prodMap = new Map<string, { nombre: string; cantidad: number; total: number }>();

      dayVentas.forEach((v) => {
        const vTotal = Number(v.total) || 0;
        totalDinero += vTotal;

        const m = v.metodoPago || 'Efectivo';
        if (!metodos[m]) metodos[m] = { count: 0, total: 0 };
        metodos[m].count += 1;
        metodos[m].total += vTotal;

        if (Array.isArray(v.items) && v.items.length > 0) {
          v.items.forEach((it) => {
            articulosTotal += it.cantidad || 1;
            const pName = it.nombre || 'Producto';
            if (!prodMap.has(pName)) {
              prodMap.set(pName, { nombre: pName, cantidad: 0, total: 0 });
            }
            const cur = prodMap.get(pName)!;
            cur.cantidad += it.cantidad || 1;
            cur.total += it.subtotal || 0;
          });
        } else {
          articulosTotal += v.cantidad || 1;
          const pName = v.producto || 'Venta general';
          if (!prodMap.has(pName)) {
            prodMap.set(pName, { nombre: pName, cantidad: 0, total: 0 });
          }
          const cur = prodMap.get(pName)!;
          cur.cantidad += v.cantidad || 1;
          cur.total += vTotal;
        }
      });

      const topProductos = Array.from(prodMap.values())
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      const cantidadVentas = dayVentas.length;
      const ticketPromedio = cantidadVentas > 0 ? totalDinero / cantidadVentas : 0;

      list.push({
        fechaKey: key,
        fechaDate: sampleDate,
        fechaTexto,
        diaSemana: dayOfWeek,
        esHoy,
        esAyer,
        cantidadVentas,
        totalDinero,
        ticketPromedio,
        articulosTotal,
        metodosPago: metodos,
        ventas: dayVentas,
        topProductos,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => b.fechaKey.localeCompare(a.fechaKey));
  }, [validVentas, todayKey, yesterdayKey]);

  // Compute weekly summaries
  const resumenesPorSemana: ResumenSemana[] = useMemo(() => {
    const map = new Map<string, ResumenDia[]>();

    resumenesPorDia.forEach((dia) => {
      const { week, year } = getWeekNumber(dia.fechaDate);
      const key = `${year}-W${String(week).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(dia);
    });

    const list: ResumenSemana[] = [];

    map.forEach((diasInWeek, weekKey) => {
      const sample = diasInWeek[0].fechaDate;
      const { week, year } = getWeekNumber(sample);
      const { start, end } = getWeekRange(sample);

      const startText = `${start.getDate()} ${MESES[start.getMonth()]}`;
      const endText = `${end.getDate()} ${MESES[end.getMonth()]} de ${end.getFullYear()}`;
      const textoRango = `Semana ${week} (${startText} al ${endText})`;

      const cantidadVentas = diasInWeek.reduce((acc, d) => acc + d.cantidadVentas, 0);
      const totalDinero = diasInWeek.reduce((acc, d) => acc + d.totalDinero, 0);
      const diasConVenta = diasInWeek.length;
      const promedioDiario = diasConVenta > 0 ? totalDinero / diasConVenta : 0;

      list.push({
        semanaKey: weekKey,
        fechaInicioStr: formatDateKey(start),
        fechaFinStr: formatDateKey(end),
        textoRango,
        numeroSemana: week,
        anio: year,
        cantidadVentas,
        totalDinero,
        promedioDiario,
        diasConVenta,
        dias: diasInWeek,
      });
    });

    return list.sort((a, b) => b.semanaKey.localeCompare(a.semanaKey));
  }, [resumenesPorDia]);

  // Compute monthly summaries
  const resumenesPorMes: ResumenMes[] = useMemo(() => {
    const map = new Map<string, ResumenDia[]>();

    resumenesPorDia.forEach((dia) => {
      const d = dia.fechaDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(dia);
    });

    const list: ResumenMes[] = [];

    map.forEach((diasInMonth, monthKey) => {
      const sample = diasInMonth[0].fechaDate;
      const monthName = MESES[sample.getMonth()];
      const year = sample.getFullYear();
      const mesNombre = `${monthName} de ${year}`;

      const cantidadVentas = diasInMonth.reduce((acc, d) => acc + d.cantidadVentas, 0);
      const totalDinero = diasInMonth.reduce((acc, d) => acc + d.totalDinero, 0);
      const diasConVenta = diasInMonth.length;
      const ticketPromedio = cantidadVentas > 0 ? totalDinero / cantidadVentas : 0;
      const promedioDiario = diasConVenta > 0 ? totalDinero / diasConVenta : 0;

      // Aggregate top products for the month
      const prodMap = new Map<string, { nombre: string; cantidad: number; total: number }>();
      diasInMonth.forEach((d) => {
        d.topProductos.forEach((p) => {
          if (!prodMap.has(p.nombre)) {
            prodMap.set(p.nombre, { nombre: p.nombre, cantidad: 0, total: 0 });
          }
          const cur = prodMap.get(p.nombre)!;
          cur.cantidad += p.cantidad;
          cur.total += p.total;
        });
      });

      const topProductos = Array.from(prodMap.values())
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      list.push({
        mesKey: monthKey,
        mesNombre,
        anio: year,
        cantidadVentas,
        totalDinero,
        ticketPromedio,
        promedioDiario,
        diasConVenta,
        dias: diasInMonth,
        topProductos,
      });
    });

    return list.sort((a, b) => b.mesKey.localeCompare(a.mesKey));
  }, [resumenesPorDia]);

  // Overall KPI metrics
  const resumenHoy = useMemo(() => {
    return resumenesPorDia.find((d) => d.fechaKey === todayKey) || null;
  }, [resumenesPorDia, todayKey]);

  const resumenEstaSemana = useMemo(() => {
    const { week, year } = getWeekNumber(new Date());
    const currentWeekKey = `${year}-W${String(week).padStart(2, '0')}`;
    return resumenesPorSemana.find((s) => s.semanaKey === currentWeekKey) || null;
  }, [resumenesPorSemana]);

  const resumenEsteMes = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return resumenesPorMes.find((m) => m.mesKey === currentMonthKey) || null;
  }, [resumenesPorMes]);

  const totalHistoricoDinero = useMemo(() => {
    return validVentas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  }, [validVentas]);

  // Filtered daily list
  const filteredDias = useMemo(() => {
    if (!searchDate.trim()) return resumenesPorDia;
    const q = searchDate.toLowerCase().trim();
    return resumenesPorDia.filter(
      (d) =>
        d.fechaTexto.toLowerCase().includes(q) ||
        d.fechaKey.includes(q) ||
        d.diaSemana.toLowerCase().includes(q)
    );
  }, [resumenesPorDia, searchDate]);

  const toggleDayExpanded = (key: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getMetodoIcon = (metodo: string) => {
    const m = metodo.toLowerCase();
    if (m.includes('efectivo')) return <Banknote className="w-3.5 h-3.5 text-emerald-600" />;
    if (m.includes('tarjeta')) return <CreditCard className="w-3.5 h-3.5 text-blue-600" />;
    if (m.includes('yappy')) return <Smartphone className="w-3.5 h-3.5 text-amber-600" />;
    return <HelpCircle className="w-3.5 h-3.5 text-stone-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ventas de Hoy */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                Ventas de Hoy
              </span>
              <Calendar className="w-4 h-4 text-amber-800" />
            </div>
            <p className="text-[11px] text-stone-500 mt-2 font-medium">
              {resumenHoy ? resumenHoy.fechaTexto.replace('Hoy · ', '') : 'Hoy (sin ventas aún)'}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900">
                {resumenHoy ? `${resumenHoy.cantidadVentas} ventas` : '0 ventas'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500">Recaudado hoy:</span>
            <span className="font-bold text-amber-950 font-serif">
              {formatCurrency(resumenHoy ? resumenHoy.totalDinero : 0, moneda)}
            </span>
          </div>
        </div>

        {/* KPI 2: Ventas de Esta Semana */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-900 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                Esta Semana
              </span>
              <CalendarRange className="w-4 h-4 text-blue-800" />
            </div>
            <p className="text-[11px] text-stone-500 mt-2 font-medium truncate">
              {resumenEstaSemana ? resumenEstaSemana.textoRango : 'Semana en curso'}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900">
                {resumenEstaSemana ? `${resumenEstaSemana.cantidadVentas} ventas` : '0 ventas'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500">Recaudado semana:</span>
            <span className="font-bold text-blue-950 font-serif">
              {formatCurrency(resumenEstaSemana ? resumenEstaSemana.totalDinero : 0, moneda)}
            </span>
          </div>
        </div>

        {/* KPI 3: Ventas de Este Mes */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                Este Mes
              </span>
              <CalendarDays className="w-4 h-4 text-emerald-800" />
            </div>
            <p className="text-[11px] text-stone-500 mt-2 font-medium">
              {resumenEsteMes ? resumenEsteMes.mesNombre : `${MESES[new Date().getMonth()]} de ${new Date().getFullYear()}`}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900">
                {resumenEsteMes ? `${resumenEsteMes.cantidadVentas} ventas` : '0 ventas'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500">Recaudado mes:</span>
            <span className="font-bold text-emerald-950 font-serif">
              {formatCurrency(resumenEsteMes ? resumenEsteMes.totalDinero : 0, moneda)}
            </span>
          </div>
        </div>

        {/* KPI 4: Total Histórico */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-950 text-white shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200 bg-amber-900/60 px-2.5 py-0.5 rounded-full">
                Total Histórico
              </span>
              <TrendingUp className="w-4 h-4 text-amber-300" />
            </div>
            <p className="text-[11px] text-amber-200/70 mt-2 font-medium">
              Transacciones válidas
            </p>
            <div className="mt-2">
              <span className="font-serif text-2xl sm:text-3xl font-extrabold text-white">
                {validVentas.length} ventas
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-900 flex items-center justify-between text-xs">
            <span className="text-amber-200/80">Facturación acumulada:</span>
            <span className="font-bold text-amber-200 font-serif">
              {formatCurrency(totalHistoricoDinero, moneda)}
            </span>
          </div>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-700" />
            <span>Resúmenes de Venta</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Consulta cuántas ventas se hicieron cada día, cada semana y cada mes con sus fechas correspondientes.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setActiveFilter('dia')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'dia'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Por Día</span>
          </button>
          <button
            onClick={() => setActiveFilter('semana')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'semana'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Por Semana</span>
          </button>
          <button
            onClick={() => setActiveFilter('mes')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'mes'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Por Mes</span>
          </button>
          <button
            onClick={() => setActiveFilter('todos')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'todos'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Vista Completa</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: RESUMEN POR DÍA (CADA DÍA CON FECHA Y NÚMERO DE VENTAS) */}
      {(activeFilter === 'dia' || activeFilter === 'todos') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-800" />
              <h3 className="font-serif font-bold text-stone-900 text-base">
                Ventas Realizadas Cada Día ({filteredDias.length} {filteredDias.length === 1 ? 'día' : 'días'})
              </h3>
            </div>

            {/* Quick search by date */}
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar fecha (ej. 19 de Septiembre, 2026)..."
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
              />
            </div>
          </div>

          {filteredDias.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2">
              <Calendar className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-medium">No se encontraron ventas para las fechas especificadas.</p>
              {onNuevoCobro && (
                <button
                  onClick={onNuevoCobro}
                  className="px-4 py-2 rounded-xl bg-amber-900 text-white text-xs font-bold hover:bg-amber-800 transition-all cursor-pointer mt-2"
                >
                  Registrar Primera Venta
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDias.map((dia, idx) => {
                const isExpanded = expandedDays.has(dia.fechaKey);
                return (
                  <div
                    key={`${dia.fechaKey}-${idx}`}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      dia.esHoy
                        ? 'border-amber-400 shadow-md ring-2 ring-amber-400/20'
                        : 'border-stone-200 shadow-sm hover:border-stone-300'
                    }`}
                  >
                    {/* Header bar for the day */}
                    <div
                      onClick={() => toggleDayExpanded(dia.fechaKey)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-stone-50/50 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-bold text-center shrink-0 ${
                            dia.esHoy
                              ? 'bg-amber-900 text-white shadow-xs'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-tighter leading-none">
                            {dia.diaSemana.slice(0, 3)}
                          </span>
                          <span className="text-base font-extrabold leading-tight">
                            {dia.fechaDate.getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-stone-900 text-sm sm:text-base">
                              {dia.fechaTexto}
                            </h4>
                            {dia.esHoy && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Hoy
                              </span>
                            )}
                            {dia.esAyer && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                                Ayer
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Fecha calendario: <span className="font-mono text-stone-700 font-semibold">{dia.fechaKey}</span>
                          </p>
                        </div>
                      </div>

                      {/* Day summary badges */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-extrabold">
                            <Receipt className="w-3.5 h-3.5 text-amber-700" />
                            <span>{dia.cantidadVentas} {dia.cantidadVentas === 1 ? 'venta' : 'ventas'}</span>
                          </div>
                          <p className="font-serif text-base font-extrabold text-stone-900 mt-1">
                            {formatCurrency(dia.totalDinero, moneda)}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                          title={isExpanded ? 'Ocultar detalles' : 'Ver ventas del día'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Quick highlights bar */}
                    <div className="px-4 sm:px-5 py-2.5 bg-white border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-stone-400" />
                          <span>Artículos vendidos: <strong>{dia.articulosTotal}</strong></span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
                          <span>Ticket promedio: <strong>{formatCurrency(dia.ticketPromedio, moneda)}</strong></span>
                        </span>
                      </div>

                      {/* Payment methods breakdown */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {Object.entries(dia.metodosPago).map(([metodo, data]) => (
                          <span
                            key={metodo}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-50 border border-stone-200 text-[11px] font-medium text-stone-700"
                          >
                            {getMetodoIcon(metodo)}
                            <span>{metodo}: {data.count} ({formatCurrency(data.total, moneda)})</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Expandable detailed sales table */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/70 space-y-4">
                        {/* Top products that day */}
                        {dia.topProductos.length > 0 && (
                          <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
                            <span className="text-[11px] uppercase font-bold text-stone-400 tracking-wider block mb-2">
                              Productos más vendidos este día
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {dia.topProductos.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900"
                                >
                                  {p.cantidad}x {p.nombre} · {formatCurrency(p.total, moneda)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* List of individual sales */}
                        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
                          <div className="p-3 bg-stone-100/70 border-b border-stone-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-800">
                              Detalle de las {dia.cantidadVentas} ventas de {dia.fechaTexto}
                            </span>
                            {onVerHistorial && (
                              <button
                                onClick={onVerHistorial}
                                className="text-xs text-amber-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Ver en Historial Completo</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-stone-600">
                              <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                  <th className="p-2.5">Hora / ID</th>
                                  <th className="p-2.5">Cliente</th>
                                  <th className="p-2.5">Productos</th>
                                  <th className="p-2.5">Pago</th>
                                  <th className="p-2.5 text-right">Monto</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100">
                                {dia.ventas.map((v, vIdx) => (
                                  <tr key={v.id ? `${v.id}-${vIdx}` : `v-${vIdx}`} className="hover:bg-stone-50/60">
                                    <td className="p-2.5">
                                      <div className="font-semibold text-stone-800 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-stone-400" />
                                        <span>{v.hora || '12:00'}</span>
                                      </div>
                                      <span className="text-[10px] text-stone-400 font-mono">
                                        {v.numeroVenta || v.id?.slice(-6) || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 font-medium text-stone-800">
                                      {v.cliente || 'Cliente General'}
                                    </td>
                                    <td className="p-2.5 max-w-[240px] truncate text-stone-700">
                                      {Array.isArray(v.items) && v.items.length > 0
                                        ? v.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')
                                        : (v.producto || 'Venta general')}
                                    </td>
                                    <td className="p-2.5">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700">
                                        {getMetodoIcon(v.metodoPago || 'Efectivo')}
                                        <span>{v.metodoPago || 'Efectivo'}</span>
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-right font-bold text-amber-950 font-serif">
                                      {formatCurrency(Number(v.total) || 0, moneda)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: RESUMEN POR SEMANA (CADA SEMANA CON FECHAS Y VENTAS) */}
      {(activeFilter === 'semana' || activeFilter === 'todos') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-blue-800" />
            <h3 className="font-serif font-bold text-stone-900 text-base">
              Ventas Realizadas Cada Semana ({resumenesPorSemana.length} semanas registradas)
            </h3>
          </div>

          {resumenesPorSemana.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400">
              No hay ventas registradas para calcular resúmenes semanales.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumenesPorSemana.map((sem, idx) => (
                <div
                  key={`${sem.semanaKey}-${idx}`}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1.5">
                        <CalendarRange className="w-3.5 h-3.5 text-blue-700" />
                        <span>Semana {sem.numeroSemana} · {sem.anio}</span>
                      </span>
                      <span className="text-xs font-extrabold text-blue-950 bg-blue-100/60 px-2.5 py-0.5 rounded-full">
                        {sem.cantidadVentas} {sem.cantidadVentas === 1 ? 'venta' : 'ventas'}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="font-serif font-bold text-stone-900 text-base">
                        {sem.textoRango}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Desde <span className="font-mono text-stone-700">{sem.fechaInicioStr}</span> hasta <span className="font-mono text-stone-700">{sem.fechaFinStr}</span>
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Total Facturado</span>
                        <span className="font-serif text-lg font-bold text-amber-950">
                          {formatCurrency(sem.totalDinero, moneda)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Promedio Diario</span>
                        <span className="font-serif text-lg font-bold text-blue-950">
                          {formatCurrency(sem.promedioDiario, moneda)}
                        </span>
                      </div>
                    </div>

                    {/* Days in week summary */}
                    <div className="mt-3 pt-3 border-t border-stone-100">
                      <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1.5">
                        Días con ventas en esta semana ({sem.diasConVenta} días)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {sem.dias.map((d, dIdx) => (
                          <span
                            key={dIdx}
                            className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium"
                          >
                            {d.diaSemana.slice(0, 2)} {d.fechaDate.getDate()}: <strong>{d.cantidadVentas} vtas</strong> ({formatCurrency(d.totalDinero, moneda)})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: RESUMEN POR MES (CADA MES CON FECHA, TOTALES Y PRODUCTOS ESTRELLA) */}
      {(activeFilter === 'mes' || activeFilter === 'todos') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-800" />
            <h3 className="font-serif font-bold text-stone-900 text-base">
              Ventas Realizadas Cada Mes ({resumenesPorMes.length} meses registrados)
            </h3>
          </div>

          {resumenesPorMes.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400">
              No hay ventas registradas para calcular resúmenes mensuales.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumenesPorMes.map((mes, idx) => (
                <div
                  key={`${mes.mesKey}-${idx}`}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{mes.mesNombre}</span>
                      </span>
                      <span className="text-xs font-extrabold text-emerald-950 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                        {mes.cantidadVentas} {mes.cantidadVentas === 1 ? 'venta' : 'ventas'}
                      </span>
                    </div>

                    <div className="mt-4">
                      <span className="text-[11px] text-stone-500 block uppercase font-bold tracking-wider">
                        Facturación Total del Mes
                      </span>
                      <span className="font-serif text-2xl font-extrabold text-emerald-950 block mt-0.5">
                        {formatCurrency(mes.totalDinero, moneda)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Ticket Promedio</span>
                        <span className="font-serif font-bold text-stone-900">
                          {formatCurrency(mes.ticketPromedio, moneda)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">Días con Venta</span>
                        <span className="font-serif font-bold text-stone-900">
                          {mes.diasConVenta} días activos
                        </span>
                      </div>
                    </div>

                    {/* Top products in month */}
                    {mes.topProductos.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-stone-100">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1.5">
                          Top Productos del Mes
                        </span>
                        <div className="space-y-1 text-xs">
                          {mes.topProductos.slice(0, 3).map((p, pIdx) => (
                            <div key={pIdx} className="flex justify-between items-center text-stone-700">
                              <span className="truncate max-w-[170px]">{p.cantidad}x {p.nombre}</span>
                              <span className="font-semibold text-stone-900 font-serif">
                                {formatCurrency(p.total, moneda)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
