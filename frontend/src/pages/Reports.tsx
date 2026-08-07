import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  RefreshCw, 
  Database,
  Baby,
  Stethoscope,
  TrendingUp,
  FlaskConical,
  Activity
} from 'lucide-react';
import { 
  GetAnimales, 
  GetInsumos, 
  GetPartos, 
  GetHistorialClinicoGeneral, 
  GetSeguimientosPesoGeneral, 
  GetEventosReproductivos 
} from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

interface ReportsProps {
  theme: string;
}

type ReportType = 'analytics' | 'animals' | 'partos' | 'treatments' | 'cycles' | 'weights' | 'supplies';

const Reports: React.FC<ReportsProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [activeReport, setActiveReport] = useState<ReportType>('analytics');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cargar datos al cambiar de reporte
  useEffect(() => {
    fetchReportData();
  }, [activeReport]);

  const fetchReportData = async () => {
    setLoading(true);
    setData([]);
    try {
      let res: any[] = [];
      switch (activeReport) {
        case 'analytics':
          // Fetch some general data to mock analytics if needed, or rely on animals
          const animals = await GetAnimales();
          const partos = await GetPartos();
          const pesos = await GetSeguimientosPesoGeneral();
          res = { animals, partos, pesos } as any;
          break;
        case 'animals':
          res = await GetAnimales();
          break;
        case 'partos':
          res = await GetPartos();
          break;
        case 'treatments':
          res = await GetHistorialClinicoGeneral();
          break;
        case 'weights':
          res = await GetSeguimientosPesoGeneral();
          break;
        case 'cycles':
          res = await GetEventosReproductivos();
          break;
        case 'supplies':
          res = await GetInsumos();
          break;
      }
      setData(res || []);
    } catch (err) {
      console.error("Error cargando reporte:", err);
    } finally {
      setLoading(false);
    }
  };

  // Convertir datos a CSV y descargar
  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    // Obtener los encabezados (headers) según el tipo de reporte
    let headers: string[] = [];
    let keys: string[] = [];
    let filename = `reporte_${activeReport}_${new Date().toISOString().split('T')[0]}`;

    switch (activeReport) {
      case 'animals':
        headers = ['ID', 'Arete/Identificador', 'Raza', 'Sexo', 'Fecha Nacimiento', 'Estatus', 'Estado Reproductivo', 'Corral ID', 'Destino'];
        keys = ['id', 'arete', 'raza', 'sexo', 'fecha_nacimiento', 'estatus', 'estado_reproductivo', 'corral_id', 'destino'];
        break;
      case 'partos':
        headers = ['ID Parto', 'ID Madre', 'Fecha Parto', 'Cantidad Crías', 'Tipo Parto', 'Observaciones'];
        keys = ['id', 'animal_id', 'fecha', 'cantidad_crias', 'tipo_parto', 'observaciones'];
        break;
      case 'treatments':
        headers = ['Fecha Aplicación', 'Insumo/Medicamento', 'Dosis Aplicada', 'Unidad', 'Técnico/MVZ', 'Observaciones', 'Fin de Retiro', 'ID Animal'];
        keys = ['fecha', 'insumo', 'dosis', 'unidad', 'tecnico', 'observaciones', 'fecha_fin_retiro', 'animal_id'];
        break;
      case 'weights':
        headers = ['ID Registro', 'ID Animal', 'Fecha Pesaje', 'Peso (KG)', 'Notas/Observaciones'];
        keys = ['id', 'animal_id', 'fecha', 'peso', 'notas'];
        break;
      case 'cycles':
        headers = ['ID Evento', 'ID Hembra', 'Tipo Evento', 'Fecha Evento', 'Macho Asignado', 'Lote Semen', 'Técnico', 'Protocolo', 'Parto Probable', 'Estatus'];
        keys = ['id', 'animal_id', 'tipo', 'fecha_evento', 'id_macho', 'lote_semen', 'tecnico', 'protocolo', 'fecha_probable_parto', 'resultado'];
        break;
      case 'supplies':
        headers = ['ID Insumo', 'Nombre', 'Categoría/Tipo', 'Unidad Medida', 'Stock Actual', 'Stock Mínimo', 'Días Retiro', 'Lote', 'Vencimiento'];
        keys = ['id', 'nombre', 'tipo', 'unidad', 'stock_actual', 'stock_minimo', 'dias_retiro', 'lote', 'fecha_vencimiento'];
        break;
    }

    // Construir contenido CSV
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of filteredData) {
      const values = keys.map(key => {
        const val = row[key];
        // Escapar comas y comillas en los textos para evitar romper columnas
        const escaped = ('' + (val !== undefined && val !== null ? val : '')).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    // Agregar UTF-8 BOM (\uFEFF) al inicio para que Excel detecte correctamente los caracteres especiales (tildes, Ñ)
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrar datos según la barra de búsqueda
  const filteredData = Array.isArray(data) ? data.filter((row: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    // Buscar en todos los valores del renglón
    return Object.values(row).some(val => 
      ('' + (val || '')).toLowerCase().includes(query)
    );
  }) : [];

  // Limitar previsualización a 12 registros para agilidad visual
  const previewData = filteredData.slice(0, 12);

  // Obtener columnas de previsualización según reporte
  const getTableHeader = () => {
    switch (activeReport) {
      case 'animals':
        return ['Arete', 'Raza', 'Sexo', 'Nacimiento', 'Estatus', 'Estado Repro.', 'Destino'];
      case 'partos':
        return ['Madre (ID/Arete)', 'Fecha Parto', 'Crías', 'Tipo Parto', 'Observaciones'];
      case 'treatments':
        return ['Fecha', 'Medicamento', 'Dosis', 'Técnico', 'Fin Retiro', 'Obs.'];
      case 'weights':
        return ['Animal', 'Fecha', 'Peso (KG)', 'Notas'];
      case 'cycles':
        return ['Hembra', 'Tipo', 'Fecha Evento', 'Parto Probable', 'Estatus'];
      case 'supplies':
        return ['Nombre', 'Categoría', 'Stock', 'Mínimo', 'Lote', 'Vencimiento'];
    }
  };

  const getTableRow = (row: any, i: number) => {
    switch (activeReport) {
      case 'animals':
        return (
          <tr key={row.id || i} className={`border-b text-xs font-semibold ${isDark ? 'border-slate-800/60 text-slate-300 hover:bg-slate-850/30' : 'border-slate-100 text-slate-700 hover:bg-slate-50'}`}>
            <td className="p-4 font-black text-emerald-600 dark:text-emerald-400">{row.arete}</td>
            <td className="p-4">{row.raza || 'Sin raza'}</td>
            <td className="p-4"><span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${row.sexo === 'Hembra' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'}`}>{row.sexo}</span></td>
            <td className="p-4">{row.fecha_nacimiento}</td>
            <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${row.estatus === 'Activo' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>{row.estatus}</span></td>
            <td className="p-4 text-cyan-600 dark:text-cyan-400 font-extrabold">{row.estado_reproductivo || 'Sin diagnóstico'}</td>
            <td className="p-4 font-extrabold">{row.destino || 'Cría'}</td>
          </tr>
        );
      case 'partos':
        return (
          <tr key={row.id || i} className={`border-b text-xs font-semibold ${isDark ? 'border-slate-800/60 text-slate-300 hover:bg-slate-850/30' : 'border-slate-100 text-slate-700 hover:bg-slate-50'}`}>
            <td className="p-4 font-black">{row.animal_id}</td>
            <td className="p-4">{row.fecha ? row.fecha.split('T')[0] : 'N/A'}</td>
            <td className="p-4 text-emerald-600 dark:text-emerald-400 font-black text-sm">{row.cantidad_crias}</td>
            <td className="p-4"><span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-400 font-bold">{row.cantidad_crias > 1 ? 'Múltiple' : 'Simple'}</span></td>
            <td className="p-4 max-w-xs truncate" title={row.observaciones}>{row.observaciones || 'Sin notas'}</td>
          </tr>
        );
      case 'treatments':
        return (
          <tr key={row.id || i} className={`border-b text-xs font-semibold ${isDark ? 'border-slate-800/60 text-slate-300 hover:bg-slate-850/30' : 'border-slate-100 text-slate-700 hover:bg-slate-50'}`}>
            <td className="p-4">{row.fecha}</td>
            <td className="p-4 font-black text-cyan-600 dark:text-cyan-400">{row.insumo}</td>
            <td className="p-4 font-black">{row.dosis} {row.unidad}</td>
            <td className="p-4">{row.tecnico}</td>
            <td className="p-4"><span className="text-rose-500 font-bold">{row.fecha_fin_retiro}</span></td>
            <td className="p-4 max-w-xs truncate" title={row.observaciones}>{row.observaciones}</td>
          </tr>
        );
      case 'weights':
        return (
          <tr key={row.id || i} className={`border-b text-xs font-semibold ${isDark ? 'border-slate-800/60 text-slate-300 hover:bg-slate-850/30' : 'border-slate-100 text-slate-700 hover:bg-slate-50'}`}>
            <td className="p-4 font-black">{row.animal_id}</td>
            <td className="p-4">{row.fecha}</td>
            <td className="p-4 text-emerald-600 dark:text-emerald-400 font-black text-sm">{row.peso} kg</td>
            <td className="p-4 max-w-xs truncate" title={row.notas}>{row.notas || 'Sin notas'}</td>
          </tr>
        );
      case 'cycles':
        return (
          <tr key={row.id || i} className={`border-b text-xs font-semibold ${isDark ? 'border-slate-800/60 text-slate-300 hover:bg-slate-850/30' : 'border-slate-100 text-slate-700 hover:bg-slate-50'}`}>
            <td className="p-4 font-black">{row.animal_id}</td>
            <td className="p-4 font-extrabold text-cyan-600 dark:text-cyan-400">{row.tipo}</td>
            <td className="p-4">{row.fecha_evento}</td>
            <td className="p-4 text-emerald-500 font-bold">{row.fecha_probable_parto || 'N/A'}</td>
            <td className="p-4"><span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black uppercase text-[10px]">{row.resultado}</span></td>
          </tr>
        );
      case 'supplies':
        return (
          <tr key={row.id || i} className={`border-b text-xs font-semibold ${isDark ? 'border-slate-800/60 text-slate-300 hover:bg-slate-850/30' : 'border-slate-100 text-slate-700 hover:bg-slate-50'}`}>
            <td className="p-4 font-black">{row.nombre}</td>
            <td className="p-4"><span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 font-bold">{row.tipo}</span></td>
            <td className="p-4 font-black text-emerald-600 dark:text-emerald-400">{row.stock_actual} {row.unidad}</td>
            <td className="p-4 text-slate-400 font-bold">{row.stock_minimo} {row.unidad}</td>
            <td className="p-4">{row.lote || 'N/A'}</td>
            <td className="p-4 text-rose-500">{row.fecha_vencimiento || 'N/A'}</td>
          </tr>
        );
    }
  };

  // Íconos y descripción de cabecera de reporte
  const getReportHeaderDetails = () => {
    switch (activeReport) {
      case 'animals':
        return {
          title: 'Registro de Hato (Animales)',
          desc: 'Inventario completo de borregas, sementales y corderos activos en el rancho.',
          icon: Database,
          color: 'text-emerald-555 text-emerald-500'
        };
      case 'partos':
        return {
          title: 'Bitácora de Partos',
          desc: 'Registro completo de nacimientos, cantidad de crías por madre e incidencias de partos.',
          icon: Baby,
          color: 'text-cyan-600 dark:text-cyan-400'
        };
      case 'treatments':
        return {
          title: 'Historial Clínico de Tratamientos',
          desc: 'Tratamientos y medicamentos administrados a cada animal con tiempos de retiro sanitarios.',
          icon: Stethoscope,
          color: 'text-rose-500'
        };
      case 'weights':
        return {
          title: 'Seguimiento de Pesos y Ganancia',
          desc: 'Historial del desarrollo corporal y control de peso individual de los animales.',
          icon: TrendingUp,
          color: 'text-cyan-500'
        };
      case 'cycles':
        return {
          title: 'Eventos de Reproducción',
          desc: 'Registro completo de montas, inseminaciones artificiales y diagnósticos de gestación.',
          icon: Activity,
          color: 'text-emerald-500 dark:text-emerald-400'
        };
      case 'supplies':
        return {
          title: 'Inventario de Insumos y Medicinas',
          desc: 'Listado de stock actual, mínimos permitidos, lotes y vencimientos de insumos sanitarios.',
          icon: FlaskConical,
          color: 'text-amber-500'
        };
      case 'analytics':
        return {
          title: 'Data Science & Analítica',
          desc: 'Panel de inteligencia de negocios y ciencia de datos sobre la producción ganadera.',
          icon: Activity,
          color: 'text-indigo-500'
        };
    }
  };

  const currentHeader = getReportHeaderDetails();

  return (
    <div className="space-y-8 pt-6 animate-in fade-in duration-500">
      
      {/* Banner Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-5xl font-black font-display tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Reportes y Descargas
          </h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-bold uppercase tracking-widest text-xs mt-1.5`}>
            Centro de exportación ejecutiva a Excel y previsualización de datos
          </p>
        </div>
        <button
          onClick={fetchReportData}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title="Actualizar Datos"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin text-emerald-500' : ''} />
        </button>
      </div>

      {/* Selectores de Tipo de Reporte (Pills Horizontales) */}
      <div className="flex flex-wrap gap-3">
        {(['analytics', 'animals', 'partos', 'treatments', 'cycles', 'weights', 'supplies'] as ReportType[]).map((type) => {
          let label = '';
          switch (type) {
            case 'analytics': label = '🧬 Data Science'; break;
            case 'animals': label = '🐑 Hato'; break;
            case 'partos': label = '🌿 Partos'; break;
            case 'treatments': label = '🩺 Tratamientos'; break;
            case 'cycles': label = '🔗 Ciclos'; break;
            case 'weights': label = '⚖️ Pesos'; break;
            case 'supplies': label = '📦 Insumos'; break;
          }
          const isActive = activeReport === type;
          return (
            <button
              key={type}
              onClick={() => setActiveReport(type)}
              className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                isActive 
                  ? 'bg-emerald-650 bg-emerald-600 text-white shadow-lg shadow-emerald-950/20 scale-105 border border-emerald-600/30' 
                  : (isDark ? 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm')
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tarjeta Ejecutiva del Reporte */}
      <div className={`p-8 md:p-10 border rounded-[40px] shadow-xl ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Cabecera Interna de la Tarjeta */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-3xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} ${currentHeader.color}`}>
              <currentHeader.icon size={30} />
            </div>
            <div>
              <h3 className={`text-2xl font-black font-display tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentHeader.title}
              </h3>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-555 text-slate-500'} mt-1 max-w-xl`}>
                {currentHeader.desc}
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Barra de Búsqueda */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Filtrar resultados..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full border rounded-2xl pl-12 pr-4 py-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* Botón de Exportación */}
            <button
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
              className={`py-4 px-6 bg-emerald-650 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark ? 'shadow-emerald-950/40' : 'shadow-emerald-500/20'
              }`}
            >
              <Download size={18} /> Exportar Excel (CSV)
            </button>
          </div>
        </div>

        {/* Tabla o Gráficas */}
        <div className="mt-8">
          {activeReport === 'analytics' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Distribución por Razas */}
                <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <h4 className={`text-lg font-black mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Distribución Genética (Razas)</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={[
                            { name: 'Dorper', value: (Array.isArray((data as any)?.animals) ? (data as any).animals : []).filter((a: any) => a.raza === 'Dorper').length || 10 },
                            { name: 'Pelibuey', value: (Array.isArray((data as any)?.animals) ? (data as any).animals : []).filter((a: any) => a.raza === 'Pelibuey').length || 5 },
                            { name: 'Katahdin', value: (Array.isArray((data as any)?.animals) ? (data as any).animals : []).filter((a: any) => a.raza === 'Katahdin').length || 15 },
                            { name: 'Cruza', value: (Array.isArray((data as any)?.animals) ? (data as any).animals : []).filter((a: any) => a.raza === 'Cruza').length || 8 },
                          ]}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#0ea5e9" />
                          <Cell fill="#f43f5e" />
                          <Cell fill="#8b5cf6" />
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Crecimiento Poblacional (Pesos/Mortalidad Mock) */}
                <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <h4 className={`text-lg font-black mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Desempeño Productivo Estimado</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { mes: 'Ene', nacimientos: 4, pesos: 12 },
                        { mes: 'Feb', nacimientos: 6, pesos: 15 },
                        { mes: 'Mar', nacimientos: 8, pesos: 18 },
                        { mes: 'Abr', nacimientos: 5, pesos: 20 },
                        { mes: 'May', nacimientos: 10, pesos: 25 },
                        { mes: 'Jun', nacimientos: 12, pesos: 28 },
                      ]}>
                        <defs>
                          <linearGradient id="colorNacimientos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="mes" stroke={isDark ? '#475569' : '#94a3b8'} />
                        <YAxis stroke={isDark ? '#475569' : '#94a3b8'} />
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                        <RechartsTooltip />
                        <Area type="monotone" dataKey="nacimientos" stroke="#10b981" fillOpacity={1} fill="url(#colorNacimientos)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 px-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Previsualización de Datos ({Math.min(filteredData.length, 12)} de {filteredData.length} registros)
                </span>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
                  Total listos: {filteredData.length}
                </span>
              </div>

              <div className={`border rounded-3xl overflow-hidden ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/20'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${isDark ? 'border-slate-850 bg-slate-950 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                        {getTableHeader().map((head, index) => (
                          <th key={index} className="p-4">{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={getTableHeader().length} className="text-center py-20">
                            <RefreshCw className="animate-spin mx-auto text-emerald-500 mb-3" size={32} />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Consultando base de datos...</span>
                          </td>
                        </tr>
                      ) : previewData.length === 0 ? (
                        <tr>
                          <td colSpan={getTableHeader().length} className="text-center py-20 text-slate-555 text-slate-400 font-bold uppercase text-xs tracking-wider italic">
                            No se encontraron registros en este reporte.
                          </td>
                        </tr>
                      ) : (
                        previewData.map((row, i) => getTableRow(row, i))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {!loading && filteredData.length > 12 && (
                <p className={`text-[10px] font-black uppercase tracking-wider text-center mt-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  * Se muestran únicamente los primeros 12 registros en la vista previa. Al presionar "Exportar Excel" se descargarán los {filteredData.length} registros completos.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
