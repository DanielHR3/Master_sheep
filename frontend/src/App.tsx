import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Compass, 
  ClipboardList, 
  Activity, 
  PlusCircle, 
  ArrowRightLeft, 
  LogOut,
  ChevronRight,
  TrendingUp,
  ScrollText,
  Calendar,
  Search,
  Bell,
  Settings,
  MoreVertical,
  Plus,
  CircleUser,
  Sun,
  Moon,
  Table,
  Lock,
  Warehouse,
  ShieldCheck,
  UserPlus,
  BadgeCheck,
  Award,
  LayoutGrid,
  Edit3,
  Trash2,
  Fence,
  Pill,
  Syringe,
  Timer,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  History as HistoryIcon,
  Baby,
  Stethoscope,
  ShieldCheck as Shield,
  FlaskConical,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { 
  AreaChart, Area, 
  XAxis, YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart, Bar,
  Cell,
  PieChart, Pie
} from 'recharts';

// Modelos generados por Wails
import { main } from "../wailsjs/go/models";

import { 
  GetAnimales, 
  GetStats, 
  Login, 
  AddAnimal, 
  RegistrarEventoReproductivo, 
  GetCorrales, 
  ConfirmarUltrasonido, 
  AddCorral,
  GetInsumos,
  AddInsumo,
  RegistrarTratamiento,
  GetTareas,
  AddTarea,
  CompletarTarea,
  GetHistorialClinico,
  RegistrarParto,
  RegistrarDiagnosticoGestacion,
  CrearRecetaVeterinaria,
  GetRecetas,
  GetPartos,
  GetDiagnosticosGestacion,
  GetUsers,
  AddUser,
  DeleteUser,
  UpdateAnimal,
  DeleteAnimal,
  GetCurrentUser,
  ChangePassword,
  AddSeguimientoPeso,
  GetSeguimientosPeso,
  ToggleDemoMode,
  GetIsDemoMode,
  ImportAnimalsExcel
} from "./services/api";

// --- STYLING UTILS ---
const COLORS = ['#5d4037', '#8d6e63', '#a1887f', '#bcaaa4', '#795548'];

// --- TYPES ---
interface DashboardStats {
  total_cabezas: number;
  fertilidad: number;
  corrales: any[];
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subTab, setSubTab] = useState<'animals' | 'supplies'>('animals');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(false);
  
  // States para datos
  const [stats, setStats] = useState<DashboardStats>({ total_cabezas: 0, fertilidad: 0, corrales: [] });
  const [animals, setAnimals] = useState<main.Animal[]>([]);
  const [corrales, setCorrales] = useState<main.Corral[]>([]);
  const [insumos, setInsumos] = useState<main.Insumo[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [users, setUsers] = useState<main.User[]>([]);
  const [historialClinico, setHistorialClinico] = useState<any[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  // Modales
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [showAddInsumo, setShowAddInsumo] = useState(false);
  const [showAddCorral, setShowAddCorral] = useState(false);
  const [showTreatment, setShowTreatment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPartoModal, setShowPartoModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<main.Animal | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [weightHistory, setWeightHistory] = useState<main.SeguimientoPeso[]>([]);

  // Formularios
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [animalForm, setAnimalForm] = useState({ arete: '', raza: 'Dorper', sexo: 'Hembra', corral: '', peso: '', fecha_nacimiento: new Date().toISOString().split('T')[0], padre_id: '', madre_id: '', destino: 'Engorda' });
  const [corralForm, setCorralForm] = useState({ nombre: '', tipo: 'General', capacidad: 50 });
  const [treatmentForm, setTreatmentForm] = useState({ insumo_id: '', dosis: 1, via: 'Intramuscular', duracion: 1, observaciones: '' });
  const [usuarioForm, setUsuarioForm] = useState({ name: '', email: '', password: '', role: 'Trabajador' });
  const [insumoForm, setInsumoForm] = useState({
    nombre: '',
    tipo: 'Medicamente',
    stock_minimo: 0,
    stock_actual: 0,
    unidad: 'ml',
    dias_retiro: 0,
    costo_unitario: 0,
    lote: '',
    fecha_vencimiento: '',
    proveedor: ''
  });
  const [editAnimalForm, setEditAnimalForm] = useState<main.Animal | null>(null);
  const [currentUser, setCurrentUser] = useState<main.User | null>(null);
  const [changePasswordForm, setChangePasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [showEditAnimal, setShowEditAnimal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [breedingForm, setBreedingForm] = useState({
    animal_id: '',
    tipo: 'Monta Natural',
    id_macho: '',
    lote_semen: '',
    tecnico: '',
    protocolo: '',
    fecha_evento: new Date().toISOString().split('T')[0],
    fecha_fin_monta: ''
  });
  const [partoForm, setPartoForm] = useState({
    animal_id: '',
    cantidad_crias: 1,
    observaciones: ''
  });
  const [weightForm, setWeightForm] = useState({ peso: 0, fecha: new Date().toISOString().split('T')[0], notas: '' });

  useEffect(() => {
    if (isLoggedIn) {
      refreshData();
      const interval = setInterval(refreshData, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const refreshData = async () => {
    try {
      const [s, a, c, i, t, u, cur] = await Promise.all([
        GetStats(),
        GetAnimales(),
        GetCorrales(),
        GetInsumos(),
        GetTareas(),
        GetUsers(),
        GetCurrentUser()
      ]);
      setStats(s as DashboardStats);
      setAnimals(a || []);
      setCorrales(c || []);
      setInsumos(i || []);
      setTareas(t || []);
      setUsers(u || []);
      setCurrentUser(cur);
      const demo = await GetIsDemoMode();
      setIsDemo(demo);
    } catch (err: any) {
      const errMsg = err?.toString() || "";
      if (errMsg.includes("no autorizado") || errMsg.includes("no autenticado")) {
        setIsLoggedIn(false);
      } else {
        console.error("Error al refrescar datos:", err);
      }
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await Login(email, password);
      setIsLoggedIn(true);
      refreshData();
    } catch (err) {
      alert("Credenciales incorrectas o error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleAddInsumo = async () => {
    try {
      const insumo = main.Insumo.createFrom(insumoForm);
      await AddInsumo(insumo);
      setShowAddInsumo(false);
      setInsumoForm({
        nombre: '',
        tipo: 'Medicamente',
        stock_minimo: 0,
        stock_actual: 0,
        unidad: 'ml',
        dias_retiro: 0,
        costo_unitario: 0,
        lote: '',
        fecha_vencimiento: '',
        proveedor: ''
      });
      refreshData();
    } catch (err) {
      alert("Error al agregar insumo");
    }
  };

  const handleAddCorral = async () => {
    try {
      const c = main.Corral.createFrom({
        nombre: corralForm.nombre,
        tipo: corralForm.tipo,
        capacidad: parseInt(corralForm.capacidad.toString())
      });
      await AddCorral(c);
      setShowAddCorral(false);
      setCorralForm({ nombre: '', tipo: 'General', capacidad: 50 });
      refreshData();
    } catch (err) {
      alert("Error al crear corral");
    }
  };

  const handleAddAnimal = async () => {
    try {
      if (!animalForm.arete) return alert("El arete es obligatorio");
      const animal = main.Animal.createFrom({
        arete: animalForm.arete,
        raza: animalForm.raza,
        sexo: animalForm.sexo,
        corral_id: animalForm.corral,
        fecha_nacimiento: animalForm.fecha_nacimiento,
        peso_nacer: parseFloat(animalForm.peso) || 0,
        padre_id: animalForm.padre_id,
        madre_id: animalForm.madre_id,
        destino: animalForm.destino
      });
      await AddAnimal(animal);
      setShowAddAnimal(false);
      setAnimalForm({ arete: '', raza: 'Dorper', sexo: 'Hembra', corral: '', peso: '', fecha_nacimiento: new Date().toISOString().split('T')[0], padre_id: '', madre_id: '', destino: 'Engorda' });
      refreshData();
    } catch (err) {
      alert("Error al registrar animal: " + err);
    }
  };

  const handleRegisterParto = async () => {
    try {
      const p = main.Parto.createFrom({
        animal_id: partoForm.animal_id,
        cantidad_crias: parseInt(partoForm.cantidad_crias.toString()),
        observaciones: partoForm.observaciones,
        fecha: new Date().toISOString()
      });
      await RegistrarParto(p);
      setShowPartoModal(false);
      setPartoForm({ animal_id: '', cantidad_crias: 1, observaciones: '' });
      refreshData();
    } catch (err) {
      alert("Error al registrar parto");
    }
  };

  const handleRegisterTreatment = async () => {
    if (!selectedAnimal) return;
    try {
      const t = main.Tratamiento.createFrom({
        animal_id: selectedAnimal.id,
        insumo_id: treatmentForm.insumo_id,
        dosis: parseFloat(treatmentForm.dosis.toString()),
        via_administracion: treatmentForm.via,
        duracion_dias: parseInt(treatmentForm.duracion.toString()),
        observaciones: treatmentForm.observaciones,
        fecha: new Date().toISOString()
      });

      // 1. Registrar el evento clínico principal
      await RegistrarTratamiento(t);

      // 2. MODERNIZACIÓN: Si el tratamiento dura más de 1 día, agendar recordatorios automáticos
      const insumoNombre = insumos.find(i => i.id === treatmentForm.insumo_id)?.nombre || "Medicamento";
      if (treatmentForm.duracion > 1) {
        for (let i = 1; i < treatmentForm.duracion; i++) {
          const reminderDate = new Date();
          reminderDate.setDate(reminderDate.getDate() + i);
          
          const tarea = main.Tarea.createFrom({
            titulo: `REMINDER: Continuar ${insumoNombre} (${treatmentForm.dosis}${insumos.find(ins => ins.id === treatmentForm.insumo_id)?.unidad || 'ml'}) - ${selectedAnimal.arete}`,
            descripcion: `Administrar dosis de refuerzo de ${insumoNombre} vía ${treatmentForm.via}. Observaciones originales: ${treatmentForm.observaciones}`,
            prioridad: 'Alta',
            estatus: 'Pendiente',
            responsable_id: '', // Asignación general
            fecha_vencimiento: reminderDate.toISOString()
          });
          
          await AddTarea(tarea);
        }
      }

      setShowTreatment(false);
      refreshData();
    } catch (err) {
      alert("Error al registrar tratamiento o programar recordatorios");
    }
  };

  const handleAddUser = async () => {
    try {
      const u = main.User.createFrom({
        name: usuarioForm.name,
        email: usuarioForm.email,
        password: usuarioForm.password,
        role: usuarioForm.role
      });
      await AddUser(u);
      setUsuarioForm({ name: '', email: '', password: '', role: 'Trabajador' });
      refreshData();
    } catch (err) {
      alert("Error al registrar usuario");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("¿Seguro que desea eliminar este usuario?")) {
      try {
        await DeleteUser(id);
        refreshData();
      } catch (err) {
        alert("Error al eliminar");
      }
    }
  };

  const handleDeleteAnimal = async (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este animal? Se borrará TODO su historial clínico y reproductivo.")) {
      try {
        await DeleteAnimal(id);
        refreshData();
      } catch (err) {
        alert("Error al eliminar animal: " + err);
      }
    }
  };

  const handleImportExcel = async () => {
    if ((window as any).go) {
      try {
        const filePath = await (window as any).runtime.OpenFileDialog({
          Title: 'Seleccionar Archivo Excel de Importación',
          Filters: [
            { Name: 'Archivos Excel', Pattern: '*.xlsx;*.xls' }
          ]
        });

        if (filePath) {
          const result = await ImportAnimalsExcel(filePath);
          alert(`Éxito: Se han importado ${result} registros correctamente.`);
          refreshData();
        }
      } catch (err: any) {
        alert("Error en la importación: " + err);
      }
    } else {
      // Modo Navegador
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setLoading(true);
      const result = await ImportAnimalsExcel(file);
      alert(`Éxito: Se han importado ${result} registros correctamente.`);
      refreshData();
    } catch (err: any) {
      alert("Error: " + err);
    } finally {
      setLoading(false);
      if (e.target) e.target.value = ''; // Reset
    }
  };

  const handleUpdateAnimal = async () => {
    if (!editAnimalForm) return;
    try {
      await UpdateAnimal(editAnimalForm);
      setShowEditAnimal(false);
      refreshData();
    } catch (err) {
      alert("Error al actualizar animal: " + err);
    }
  };

  const handleChangePassword = async () => {
    if (changePasswordForm.new !== changePasswordForm.confirm) {
      return alert("Las contraseñas nuevas no coinciden");
    }
    try {
      await ChangePassword(changePasswordForm.old, changePasswordForm.new);
      alert("Contraseña actualizada con éxito");
      setShowChangePassword(false);
      setChangePasswordForm({ old: '', new: '', confirm: '' });
    } catch (err) {
      alert("Error: " + err);
    }
  };

  const handleAddWeight = async () => {
    if (!selectedAnimal) return;
    try {
      await AddSeguimientoPeso(main.SeguimientoPeso.createFrom({
        animal_id: selectedAnimal.id,
        peso: parseFloat(weightForm.peso.toString()),
        fecha: weightForm.fecha,
        notas: weightForm.notas
      }));
      setShowWeightModal(false);
      setWeightForm({ peso: 0, fecha: new Date().toISOString().split('T')[0], notas: '' });
      refreshData();
    } catch (err) {
      alert("Error al registrar peso: " + err);
    }
  };

  const handleViewWeights = async (animal: main.Animal) => {
    setSelectedAnimal(animal);
    try {
      const history = await GetSeguimientosPeso(animal.id);
      setWeightHistory(history || []);
      setShowWeightHistory(true);
    } catch (err) {
      alert("Error al obtener historial de peso");
    }
  };

  const handleOpenWeightModal = (animal: main.Animal) => {
    setSelectedAnimal(animal);
    setShowWeightModal(true);
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} loading={loading} email={email} setEmail={setEmail} password={password} setPassword={setPassword} />;
  }

  return (
    <div className={`min-h-screen transition-all duration-1000 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} font-sans selection:bg-antique-brass selection:text-white`}>
      {isLoggedIn && isDemo && <DemoBanner />}
      
      {/* Sidebar Desktop */}
      <aside className={`fixed left-0 top-0 h-full w-80 z-40 hidden lg:block border-r transition-all ${theme === 'dark' ? 'bg-clay/20 border-white/5 backdrop-blur-3xl' : 'bg-white border-6666-cream/10'}`}>
        <div className="p-10">
          <div className="flex items-center gap-4 mb-16 group">
            <div className="w-14 h-14 bg-6666-maroon rounded-[22px] rotate-12 flex items-center justify-center shadow-2xl shadow-6666-maroon/40 group-hover:rotate-0 transition-transform duration-500 border border-6666-cream/20 overflow-hidden p-2">
              <img src="/logo.png" alt="Master Sheep Logo" className="w-full h-full object-contain -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-tighter font-display ${theme === 'dark' ? 'bg-gradient-to-br from-white to-6666-cream bg-clip-text text-transparent' : 'text-slate-900'}`}>MASTER<br /><span className="text-6666-cream">SHEEP PRO</span></h1>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-tight mt-1">Gestión Genética & Productiva</p>
            </div>
          </div>

          <nav className="space-y-3">
            <SidebarItem icon={<Compass size={22} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={<Users size={22} />} label="Inventario Hato" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
            <SidebarItem icon={<Warehouse size={22} />} label="Corrales" active={activeTab === 'corrales'} onClick={() => setActiveTab('corrales')} />
            <SidebarItem icon={<ClipboardList size={22} />} label="Reproducción" active={activeTab === 'breeding'} onClick={() => setActiveTab('breeding')} />
            <SidebarItem icon={<Stethoscope size={22} />} label="Control Clínico" active={activeTab === 'clinical'} onClick={() => setActiveTab('clinical')} />
            <SidebarItem icon={<ShieldCheck size={22} />} label="Personal" active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} />
            <div className="pt-8 mt-8 border-t border-white/5">
               <SidebarItem icon={<CircleUser size={22} />} label="Mi Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
               <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all mt-4 group">
                 <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>
               </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-80 flex-1 p-6 md:p-12 pb-32 lg:pb-12 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && <DashboardContent stats={stats} tareas={tareas} theme={theme} onGlobalAdd={() => setShowAddAnimal(true)} onCompleteTask={async (id) => { await CompletarTarea(id); refreshData(); }} />}
        {activeTab === 'inventory' && (
          <InventoryContent 
            animals={animals} 
            insumos={insumos} 
            theme={theme} 
            subTab={subTab} 
            setSubTab={setSubTab} 
            onAddAnimal={() => { 
              setAnimalForm({ arete: '', raza: 'Dorper', sexo: 'Hembra', corral: '', peso: '', fecha_nacimiento: new Date().toISOString().split('T')[0], padre_id: '', madre_id: '', destino: 'Engorda' }); 
              setShowAddAnimal(true); 
            }} 
            onAddInsumo={() => { 
              setInsumoForm({ nombre: '', tipo: 'Medicamente', stock_actual: 0, stock_minimo: 0, unidad: 'ml', costo_unitario: 0, dias_retiro: 0, lote: '', fecha_vencimiento: '', proveedor: '' }); 
              setShowAddInsumo(true); 
            }} 
            onConfirmUltrasound={(a: main.Animal) => { 
              setSelectedAnimal(a); 
              setShowConfirmModal(true); 
            }} 
            onTreatment={(a: any) => { 
              setSelectedAnimal(a); 
              setShowTreatment(true); 
            }} 
            onViewHistory={async (a: any) => { 
              setSelectedAnimal(a); 
              try {
                const history = await GetHistorialClinico(a.id);
                setHistorialClinico(history || []);
              } catch (e) {
                console.error(e);
              }
              setShowHistory(true); 
            }} 
            onEditAnimal={(a: main.Animal) => { 
              setEditAnimalForm(a); 
              setShowEditAnimal(true); 
            }} 
            onDeleteAnimal={handleDeleteAnimal} 
            onAddWeight={handleOpenWeightModal} 
            onViewWeights={handleViewWeights} 
            onImportExcel={handleImportExcel}
          />
        )}
        {activeTab === 'corrales' && <CorralesContent corrales={corrales} animals={animals} theme={theme} onAddCorral={() => setShowAddCorral(true)} />}
        {activeTab === 'breeding' && <BreedingContent animals={animals} form={breedingForm} setForm={setBreedingForm} onRegister={async () => { 
            if (!breedingForm.animal_id) return alert("Seleccione un animal");
            try {
              await RegistrarEventoReproductivo(main.EventoReproductivo.createFrom(breedingForm)); 
              alert("Evento registrado con éxito");
              refreshData(); 
            } catch (err: any) {
              console.error(err);
              if (err.message?.includes("Modo Lectura")) {
                alert("MODO LECTURA ACTIVO: Esta acción no está permitida.");
              } else {
                alert("Error al guardar: " + err.message);
              }
            }
        }} theme={theme} onRegisterParto={() => setShowPartoModal(true)} />}
        {activeTab === 'clinical' && <ClinicalContent animals={animals} insumos={insumos} theme={theme} onTreatment={(a: any) => { setSelectedAnimal(a); setShowTreatment(true); }} />}
        {activeTab === 'staff' && <StaffContent users={users} form={usuarioForm} setForm={setUsuarioForm} onAdd={handleAddUser} onDelete={handleDeleteUser} theme={theme} />}
        {activeTab === 'profile' && <ProfileContent theme={theme} setTheme={setTheme} onSecurity={() => setShowChangePassword(true)} onStaff={() => setActiveTab('staff')} user={currentUser} isDemo={isDemo} setIsDemo={setIsDemo} ToggleDemoMode={ToggleDemoMode} />}
      </main>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx,.xls" 
        onChange={handleFileChange} 
      />

      {/* Navegación Móvil */}
      <div className={`fixed bottom-0 left-0 right-0 h-24 lg:hidden z-50 border-t flex justify-around items-center px-6 transition-all ${theme === 'dark' ? 'bg-slate-950/80 border-white/5 backdrop-blur-xl' : 'bg-white/80 border-antique-brass/10 backdrop-blur-xl'}`}>
        <MobileNavItem icon={<Compass size={24} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<Users size={24} />} active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
        <MobileNavItem icon={<ClipboardList size={24} />} active={activeTab === 'breeding'} onClick={() => setActiveTab('breeding')} />
        <MobileNavItem icon={<Stethoscope size={24} />} active={activeTab === 'clinical'} onClick={() => setActiveTab('clinical')} />
        <MobileNavItem icon={<CircleUser size={24} />} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
      </div>

      {/* Modales Genéricos */}
      <Modal show={showAddAnimal} onClose={() => setShowAddAnimal(false)} title="Agregar Nuevo Animal">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Número de Arete</label>
              <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={animalForm.arete} onChange={e => setAnimalForm({...animalForm, arete: e.target.value})} placeholder="SM-001" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Raza</label>
              <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={animalForm.raza} onChange={e => setAnimalForm({...animalForm, raza: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Sexo</label>
              <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={animalForm.sexo} onChange={e => setAnimalForm({...animalForm, sexo: e.target.value})}>
                <option value="Hembra">Hembra</option>
                <option value="Macho">Macho</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Corral</label>
              <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={animalForm.corral} onChange={e => setAnimalForm({...animalForm, corral: e.target.value})}>
                <option value="">Sin asignar</option>
                {corrales.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Fecha Nacimiento</label>
              <input type="date" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={animalForm.fecha_nacimiento} onChange={e => setAnimalForm({...animalForm, fecha_nacimiento: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Peso al Nacer (kg)</label>
              <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={animalForm.peso} onChange={e => setAnimalForm({...animalForm, peso: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">ID del Padre (Semental)</label>
              <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={animalForm.padre_id} onChange={e => setAnimalForm({...animalForm, padre_id: e.target.value})} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">ID de la Madre</label>
              <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={animalForm.madre_id} onChange={e => setAnimalForm({...animalForm, madre_id: e.target.value})} placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Destino Productivo</label>
            <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={animalForm.destino} onChange={e => setAnimalForm({...animalForm, destino: e.target.value})}>
              <option value="Engorda">Engorda (Corderos)</option>
              <option value="Pie de Cría">Pie de Cría (Hembras seleccionadas)</option>
              <option value="Semental">Semental</option>
            </select>
          </div>
          <button onClick={handleAddAnimal} className="w-full py-4 bg-saddle-tan text-white font-black rounded-xl hover:bg-antique-brass transition-all">GUARDAR ANIMAL</button>
        </div>
      </Modal>

      <Modal show={showAddCorral} onClose={() => setShowAddCorral(false)} title="Nuevo Registro de Corral">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Nombre del Corral</label>
            <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={corralForm.nombre} onChange={e => setCorralForm({...corralForm, nombre: e.target.value})} placeholder="Ej. Corral de Engorda 1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Tipo / Propósito</label>
              <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={corralForm.tipo} onChange={e => setCorralForm({...corralForm, tipo: e.target.value})}>
                <option value="General">General</option>
                <option value="Maternidad">Maternidad</option>
                <option value="Engorda">Engorda</option>
                <option value="Cuarentena">Cuarentena</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Capacidad (Animales)</label>
              <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={corralForm.capacidad} onChange={e => setCorralForm({...corralForm, capacidad: parseInt(e.target.value)})} />
            </div>
          </div>
          <button onClick={handleAddCorral} className="w-full py-4 bg-antique-brass text-white font-black rounded-xl hover:bg-saddle-tan transition-all">CREAR CORRAL</button>
        </div>
      </Modal>

      <Modal show={showTreatment} onClose={() => setShowTreatment(false)} title={`Nuevo Tratamiento - ${selectedAnimal?.arete}`}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Insumo / Medicamento</label>
            <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={treatmentForm.insumo_id} onChange={e => setTreatmentForm({...treatmentForm, insumo_id: e.target.value})}>
              <option value="">Seleccionar...</option>
              {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.stock_actual} en stock)</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Dosis</label>
              <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={treatmentForm.dosis} onChange={e => setTreatmentForm({...treatmentForm, dosis: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Días de Duración</label>
              <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={treatmentForm.duracion} onChange={e => setTreatmentForm({...treatmentForm, duracion: parseInt(e.target.value)})} />
            </div>
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-slate-500">Vía</label>
             <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={treatmentForm.via} onChange={e => setTreatmentForm({...treatmentForm, via: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Observaciones</label>
            <textarea className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white h-24" value={treatmentForm.observaciones} onChange={e => setTreatmentForm({...treatmentForm, observaciones: e.target.value})} />
          </div>
          <button onClick={handleRegisterTreatment} className="w-full py-4 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 transition-all">REGISTRAR EN BITÁCORA</button>
        </div>
      </Modal>

      <Modal show={showHistory} onClose={() => setShowHistory(false)} title={`Historial Clínico - ${selectedAnimal?.arete}`}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {historialClinico.length > 0 ? historialClinico.map((h, idx) => (
            <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
              <div className="flex justify-between mb-2">
                <span className="text-antique-brass font-black text-xs uppercase">{h.tipo_insumo || 'Tratamiento'}</span>
                <span className="text-slate-500 text-[10px]">{new Date(h.fecha).toLocaleDateString()}</span>
              </div>
              <p className="text-white font-bold">{h.nombre_insumo}</p>
              <p className="text-slate-400 text-[10px] mt-1">{h.observaciones}</p>
            </div>
          )) : <p className="text-center text-slate-500 py-10">No hay registros clínicos</p>}
        </div>
      </Modal>

      <Modal show={showAddInsumo} onClose={() => setShowAddInsumo(false)} title="Agregar Nuevo Insumo / Lote">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500">Nombre</label>
              <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white" value={insumoForm.nombre} onChange={e => setInsumoForm({...insumoForm, nombre: e.target.value})} placeholder="Ej. Ivermectina" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500">Tipo</label>
              <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white" value={insumoForm.tipo} onChange={e => setInsumoForm({...insumoForm, tipo: e.target.value})}>
                <option value="Medicamente">Medicamento</option>
                <option value="Alimento">Alimento</option>
                <option value="Suplemento">Suplemento</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500">Stock Actual</label>
              <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white" value={insumoForm.stock_actual} onChange={e => setInsumoForm({...insumoForm, stock_actual: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500">Unidad</label>
              <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white" value={insumoForm.unidad} onChange={e => setInsumoForm({...insumoForm, unidad: e.target.value})} placeholder="ml / kg" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500">Costo Unit.</label>
              <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white" value={insumoForm.costo_unitario} onChange={e => setInsumoForm({...insumoForm, costo_unitario: parseFloat(e.target.value)})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500">Lote</label>
              <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white" value={insumoForm.lote} onChange={e => setInsumoForm({...insumoForm, lote: e.target.value})} placeholder="LOT-2024-X" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500">Vencimiento</label>
              <input type="date" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white" value={insumoForm.fecha_vencimiento} onChange={e => setInsumoForm({...insumoForm, fecha_vencimiento: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-500">Proveedor</label>
            <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white" value={insumoForm.proveedor} onChange={e => setInsumoForm({...insumoForm, proveedor: e.target.value})} placeholder="Nombre de la veterinaria o distribuidor" />
          </div>
          <button onClick={handleAddInsumo} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs mt-4">GUARDAR EN INVENTARIO</button>
        </div>
      </Modal>

      <Modal show={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirmar Diagnóstico">
          <div className="space-y-8 py-4">
              <div className="text-center">
                  <Activity size={48} className="text-antique-brass mx-auto mb-4" />
                  <p className="text-slate-400">¿Desea confirmar el estado de gestación para el animal <span className="text-white font-black">{selectedAnimal?.arete}</span>?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <button onClick={async () => { await ConfirmarUltrasonido(selectedAnimal!.id, true, 1); setShowConfirmModal(false); refreshData(); }} className="py-4 bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px]">Positivo (+)</button>
                  <button onClick={async () => { await ConfirmarUltrasonido(selectedAnimal!.id, false, 0); setShowConfirmModal(false); refreshData(); }} className="py-4 bg-rose-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px]">Negativo (-)</button>
              </div>
          </div>
      </Modal>

      <Modal show={showPartoModal} onClose={() => setShowPartoModal(false)} title="Registrar Nuevo Parto">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Arete de la Madre</label>
            <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={partoForm.animal_id} onChange={e => setPartoForm({...partoForm, animal_id: e.target.value})} placeholder="SM-000" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Cantidad de Crías</label>
            <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={partoForm.cantidad_crias} onChange={e => setPartoForm({...partoForm, cantidad_crias: parseInt(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Observaciones</label>
            <textarea className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white h-24" value={partoForm.observaciones} onChange={e => setPartoForm({...partoForm, observaciones: e.target.value})} />
          </div>
          <button onClick={handleRegisterParto} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs mt-4">FINALIZAR GESTACIÓN</button>
        </div>
      </Modal>

      {editAnimalForm && (
        <Modal show={showEditAnimal} onClose={() => setShowEditAnimal(false)} title={`Editar Animal: ${editAnimalForm.arete}`}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Número de Arete</label>
                <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={editAnimalForm.arete} onChange={e => setEditAnimalForm({...editAnimalForm, arete: e.target.value} as any)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Raza</label>
                <input type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={editAnimalForm.raza} onChange={e => setEditAnimalForm({...editAnimalForm, raza: e.target.value} as any)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Estatus</label>
                <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={editAnimalForm.estatus} onChange={e => setEditAnimalForm({...editAnimalForm, estatus: e.target.value} as any)}>
                  <option value="Activo">Activo</option>
                  <option value="Vendido">Vendido</option>
                  <option value="Baja">Baja / Muerte</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Corral</label>
                <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={editAnimalForm.corral_id} onChange={e => setEditAnimalForm({...editAnimalForm, corral_id: e.target.value} as any)}>
                  {corrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleUpdateAnimal} className="w-full py-4 bg-antique-brass text-white font-black rounded-xl hover:bg-saddle-tan transition-all">ACTUALIZAR DATOS</button>
          </div>
        </Modal>
      )}

      <Modal show={showChangePassword} onClose={() => setShowChangePassword(false)} title="Cambiar Contraseña">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Contraseña Actual</label>
            <input type="password" title="Contraseña Actual" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={changePasswordForm.old} onChange={e => setChangePasswordForm({...changePasswordForm, old: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Nueva Contraseña</label>
            <input type="password" title="Nueva Contraseña" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={changePasswordForm.new} onChange={e => setChangePasswordForm({...changePasswordForm, new: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Confirmar Nueva Contraseña</label>
            <input type="password" title="Confirmar Nueva Contraseña" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={changePasswordForm.confirm} onChange={e => setChangePasswordForm({...changePasswordForm, confirm: e.target.value})} />
          </div>
          <button onClick={handleChangePassword} className="w-full py-4 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-all">CAMBIAR CONTRASEÑA</button>
        </div>
      </Modal>

      <Modal show={showWeightModal} onClose={() => setShowWeightModal(false)} title={`Registrar Peso - ${selectedAnimal?.arete}`}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Peso (kg)</label>
              <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={weightForm.peso} onChange={e => setWeightForm({...weightForm, peso: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Fecha</label>
              <input type="date" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" value={weightForm.fecha} onChange={e => setWeightForm({...weightForm, fecha: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Notas / Comentarios</label>
            <textarea className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white h-24" value={weightForm.notas} onChange={e => setWeightForm({...weightForm, notas: e.target.value})} placeholder="Ej. Control mensual 3 meses" />
          </div>
          <button onClick={handleAddWeight} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs">GUARDAR PESAJE</button>
        </div>
      </Modal>

      <Modal show={showWeightHistory} onClose={() => setShowWeightHistory(false)} title={`Historial de Crecimiento - ${selectedAnimal?.arete}`}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {weightHistory.length > 0 ? (
            <div className="space-y-3">
              {weightHistory.map((w, idx) => (
                <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="text-white font-bold text-xl">{w.peso} kg</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">{new Date(w.fecha).toLocaleDateString()}</p>
                    {w.notas && <p className="text-[10px] text-antique-brass mt-1 italic">{w.notas}</p>}
                  </div>
                  {idx > 0 && (
                    <div className="text-right">
                      <p className={`text-xs font-black ${(w.peso - weightHistory[idx-1].peso) > 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                        +{(w.peso - weightHistory[idx-1].peso).toFixed(2)} kg
                      </p>
                      <p className="text-[8px] text-slate-500 uppercase">Ganancia</p>
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-6 p-6 bg-saddle-tan/10 border border-saddle-tan/20 rounded-3xl">
                <p className="text-[10px] text-saddle-tan font-black uppercase mb-1">Ganancia Total</p>
                <p className="text-3xl text-white font-black italic font-serif">{(weightHistory[weightHistory.length-1].peso - weightHistory[0].peso).toFixed(2)} kg</p>
              </div>
            </div>
          ) : <p className="text-center text-slate-500 py-10">No hay registros de peso registrados.</p>}
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function Modal({ show, onClose, title, children }: { show: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[40px] shadow-3xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
          <h3 className="text-xl font-black text-white font-serif italic">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-all">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        <div className="p-10">{children}</div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-6666-maroon text-white shadow-xl shadow-6666-maroon/30 translate-x-1' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
      <div className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all ${active ? 'bg-saddle-tan text-white' : 'text-slate-500'}`}>
      {icon}
    </button>
  );
}

function DashboardContent({ stats, tareas, theme, onGlobalAdd, onCompleteTask }: { stats: DashboardStats, tareas: any[], theme: string, onGlobalAdd: () => void, onCompleteTask: (id: string) => void }) {
  return (
    <div className="space-y-10 pt-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-5xl font-black font-display tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Bienvenido a Master Sheep Pro</h2>
          <p className="text-6666-cream font-black uppercase tracking-widest text-[10px] mt-1">Panel de Control de Engorda y Mejora Genética</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5 shadow-2xl' : 'bg-white border-antique-brass/20'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-[24px] ${theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'}`}>
              <Users size={24} className="text-antique-brass" />
            </div>
          </div>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Total Hato</p>
          <h2 className="text-6xl font-black tracking-tighter mt-2 font-display">{stats.total_cabezas || 0}</h2>
        </div>

        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5 shadow-2xl' : 'bg-white border-antique-brass/20'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-[24px] ${theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'}`}>
              <TrendingUp size={24} className="text-saddle-tan" />
            </div>
          </div>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">En Engorda</p>
          <h2 className="text-6xl font-black tracking-tighter mt-2 font-display">{(stats as any).en_engorda || 0}</h2>
        </div>

        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5 shadow-2xl' : 'bg-white border-6666-cream/20'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-[24px] ${theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'}`}>
              <Award size={24} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Pie de Cría</p>
          <h2 className="text-6xl font-black tracking-tighter mt-2 font-display">{(stats as any).pie_de_cria || 0}</h2>
        </div>

        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5 shadow-2xl' : 'bg-white border-6666-cream/20'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-[24px] ${theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'}`}>
              <AlertTriangle size={24} className="text-rose-500" />
            </div>
          </div>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Bajas</p>
          <h2 className="text-6xl font-black tracking-tighter mt-2 font-display">{(stats as any).bajas || 0}</h2>
        </div>

        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/50 border-white/10' : 'bg-stone-50 border-6666-cream/20'} md:col-span-1`}>
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2">
                <Bell size={18} className="text-6666-maroon" />
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Agenda del Día</p>
             </div>
          </div>
          <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
            {tareas.filter(t => t.estatus === 'Pendiente').length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">No hay tareas para hoy</p>
            ) : (
              tareas.filter(t => t.estatus === 'Pendiente').sort((a, b) => a.titulo.startsWith('REMINDER') ? -1 : 1).map(t => {
                const isReminder = t.titulo.startsWith('REMINDER');
                return (
                  <div key={t.id} className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${isReminder ? 'bg-rose-500/10 border-rose-500/20 shadow-lg shadow-rose-500/5' : 'bg-slate-950/50 border-white/5'}`}>
                    <div className="flex items-center gap-3 truncate">
                      {isReminder ? <Syringe size={16} className="text-rose-500 shrink-0" /> : <ClipboardList size={16} className="text-slate-500 shrink-0" />}
                      <div className="truncate">
                        <p className={`text-xs font-black truncate ${isReminder ? 'text-rose-100' : 'text-white'}`}>{t.titulo}</p>
                        <p className="text-[8px] text-slate-500 mt-0.5 uppercase font-bold">{t.prioridad} • {t.fecha_vencimiento ? new Date(t.fecha_vencimiento).toLocaleDateString() : 'Hoy'}</p>
                      </div>
                    </div>
                    <button onClick={() => onCompleteTask(t.id)} className={`p-2 rounded-xl transition-all ${isReminder ? 'bg-rose-500 text-white' : 'bg-6666-maroon/20 text-6666-maroon opacity-0 group-hover:opacity-100'}`}>
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button onClick={onGlobalAdd} className="p-8 rounded-[40px] bg-6666-maroon text-white font-black flex flex-col justify-between hover:bg-6666-sand hover:text-6666-maroon transition-all shadow-2xl shadow-6666-maroon/30">
          <div className="p-4 bg-white/10 rounded-[24px] w-fit mb-4"><PlusCircle size={28} /></div>
          <div className="text-left">
            <p className="text-white/60 font-black uppercase text-[10px] tracking-widest mb-1">Registro Rápido</p>
            <h3 className="text-2xl font-black uppercase leading-tight">ALTA ANIMAL</h3>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`p-8 rounded-[40px] border ${theme === 'dark' ? 'bg-clay/20 border-white/5' : 'bg-white border-6666-cream/10'}`} style={{ minHeight: '400px' }}>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2"><LayoutGrid size={16} /> Distribución por Corral</h4>
            <div className="h-full w-full" style={{ minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.corrales || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                        <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '20px', border: 'none', backgroundColor: '#1c1917'}} />
                        <Bar dataKey="cantidad" fill="#8d6e63" radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
}

function CorralesContent({ corrales, animals, theme, onAddCorral }: { corrales: main.Corral[], animals: main.Animal[], theme: string, onAddCorral: () => void }) {
  return (
    <div className="space-y-10 pt-10 animate-in slide-in-from-right-8 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-4xl font-black font-display tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Gestión de Corrales</h2>
          <p className="text-antique-brass font-black uppercase tracking-widest text-[10px] mt-1">Infraestructura y Capacidad</p>
        </div>
        <button onClick={onAddCorral} className="bg-6666-maroon hover:bg-6666-sand hover:text-6666-maroon text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase shadow-lg shadow-6666-maroon/20 flex items-center gap-3 transition-all active:scale-95"><Plus size={18} /> Nuevo Corral</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {corrales.length > 0 ? corrales.map((corral) => {
          const occupancy = animals.filter(a => a.corral_id === corral.nombre || a.corral_id === corral.id).length;
          const percentage = (occupancy / (corral.capacidad || 1)) * 100;
          return (
            <div key={corral.id} className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5' : 'bg-white border-6666-cream/20'}`}>
              <div className="flex justify-between mb-6">
                <div className="p-4 bg-slate-950 rounded-[20px]"><Warehouse size={24} className="text-6666-cream" /></div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black h-fit ${percentage > 90 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{percentage.toFixed(0)}%</span>
              </div>
              <h4 className="text-3xl font-black font-display tracking-tight text-white mb-2">{corral.nombre}</h4>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Capacidad: {corral.capacidad} Animales</p>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-6666-maroon" style={{ width: `${Math.min(percentage, 100)}%` }} />
              </div>
            </div>
          );
        }) : <div className="col-span-full py-20 text-center opacity-30"><Warehouse size={64} className="mx-auto mb-4" /><p className="font-black uppercase text-xs">Sin corrales</p></div>}
      </div>
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="bg-rose-600 text-white py-2 px-6 flex items-center justify-center gap-4 animate-pulse">
      <Lock size={14} />
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">SISTEMA EN MODO LECTURA (DEMO) - NO SE PERMITEN MODIFICACIONES</span>
      <Lock size={14} />
    </div>
  );
}

function InventoryContent({ animals, insumos, theme, subTab, setSubTab, onAddAnimal, onAddInsumo, onConfirmUltrasound, onTreatment, onViewHistory, onEditAnimal, onDeleteAnimal, onAddWeight, onViewWeights, onImportExcel }: any) {
  return (
    <div className="space-y-10 pt-10 animate-in slide-in-from-right-8 duration-700">
      <div className="flex justify-between items-center">
        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
           <button onClick={() => setSubTab('animals')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${subTab === 'animals' ? 'bg-saddle-tan text-white' : 'text-slate-500'}`}>Animales</button>
           <button onClick={() => setSubTab('supplies')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${subTab === 'supplies' ? 'bg-saddle-tan text-white' : 'text-slate-500'}`}>Insumos</button>
        </div>
        <div className="flex gap-4">
           {subTab === 'animals' && (
             <>
               <button onClick={onImportExcel} className="bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 px-6 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all">
                 <FileSpreadsheet size={18} /> Carga Masiva (Excel)
               </button>
               <button onClick={onAddAnimal} className="bg-saddle-tan text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-saddle-tan/20 flex items-center gap-2">
                 <PlusCircle size={18} /> Alta de Animal
               </button>
             </>
           )}
           {subTab === 'supplies' && <button onClick={onAddInsumo} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-500/20 flex items-center gap-2"><PlusCircle size={18} /> Agregar Stock</button>}
        </div>
      </div>

      {subTab === 'animals' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {animals.map((a: main.Animal) => (
            <AnimalCard key={a.id} animal={a} theme={theme} onSelect={() => onConfirmUltrasound(a)} onTreatment={() => onTreatment(a)} onViewHistory={() => onViewHistory(a)} onEdit={() => onEditAnimal(a)} onDelete={() => onDeleteAnimal(a.id)} onAddWeight={() => onAddWeight(a)} onViewWeights={() => onViewWeights(a)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {insumos.map((i: main.Insumo) => {
            const expiryDate = i.fecha_vencimiento ? new Date(i.fecha_vencimiento) : null;
            const isExpiringSoon = expiryDate && expiryDate.getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000 && expiryDate.getTime() > new Date().getTime();
            const isExpired = expiryDate && expiryDate.getTime() < new Date().getTime();
            
            return (
              <div key={i.id} className="p-8 bg-clay/30 border border-white/5 rounded-[40px] relative overflow-hidden group hover:border-antique-brass/30 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-slate-950 rounded-2xl"><FlaskConical size={24} className="text-antique-brass" /></div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${i.stock_actual < i.stock_minimo ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'bg-emerald-500/20 text-emerald-500'}`}>STOCK: {i.stock_actual} {i.unidad}</span>
                    {isExpired && <span className="px-2 py-1 bg-rose-600 text-white text-[8px] font-black rounded uppercase">VENCIDO</span>}
                    {isExpiringSoon && !isExpired && <span className="px-2 py-1 bg-amber-500 text-black text-[8px] font-black rounded uppercase">PRÓX. VENCIMIENTO</span>}
                  </div>
                </div>
                <h4 className="text-2xl font-black text-white italic font-serif mb-1">{i.nombre}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{i.tipo} • Lote: <span className="text-antique-brass">{i.lote || 'N/A'}</span></p>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-2 bg-slate-950/50 rounded-xl border border-white/5">
                    <p className="text-[8px] text-slate-500 uppercase font-black">Vencimiento</p>
                    <p className="text-[10px] text-white font-bold">{i.fecha_vencimiento || 'No registrada'}</p>
                  </div>
                  <div className="p-2 bg-slate-950/50 rounded-xl border border-white/5">
                    <p className="text-[8px] text-slate-500 uppercase font-black">Proveedor</p>
                    <p className="text-[10px] text-white font-bold truncate">{i.proveedor || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-black text-slate-400">
                  <span>RETIRO: {i.dias_retiro} DÍAS</span>
                  <span className="text-white">${i.costo_unitario} /u</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BreedingContent({ animals, form, setForm, onRegister, theme, onRegisterParto }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-10 animate-in slide-in-from-right-8 duration-700">
      <div className="lg:col-span-2 p-10 bg-clay/30 border border-white/5 rounded-[50px] shadow-2xl">
        <h3 className="text-3xl font-black italic font-serif text-white mb-10 flex items-center gap-4"><ClipboardList className="text-antique-brass" size={32} /> Gestión de Ciclos</h3>
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-8">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 px-1">Seleccionar Borrega</label>
               <select className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" value={form.animal_id} onChange={e => setForm({...form, animal_id: e.target.value})}>
                 <option value="">Seleccione...</option>
                 {animals.filter((a: any) => a.sexo === 'Hembra').map((a: any) => (
                   <option key={a.id} value={a.id}>{a.arete} ({a.raza})</option>
                 ))}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 px-1">Técnica</label>
               <select className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                 <option value="Monta Natural">Monta Natural</option>
                 <option value="Inseminación Artificial">I.A (Inseminación)</option>
               </select>
             </div>
          </div>
          <div className="flex gap-4">
            <button onClick={onRegister} className="flex-1 py-6 bg-saddle-tan text-white font-black rounded-[30px] text-xl shadow-2xl shadow-saddle-tan/40 transform active:scale-95 transition-all">REGISTRAR EVENTO</button>
            <button onClick={() => onRegisterParto()} className="px-10 py-6 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-black rounded-[30px] text-xl transform active:scale-95 transition-all hover:bg-emerald-600 hover:text-white">REGISTRAR PARTO</button>
          </div>
        </div>
      </div>
      <div className="p-8 bg-gradient-to-br from-clay/40 to-slate-950 border border-white/5 rounded-[40px]">
         <h4 className="text-xs font-black text-antique-brass flex items-center gap-2 mb-6 uppercase italic font-serif"><Bell size={18} /> Próximos Partos</h4>
         <div className="space-y-4">
            <NextBirth id="BOR-0422" date="Hoy" progress={145} />
            <NextBirth id="BOR-0881" date="12 Abr" progress={132} />
         </div>
      </div>
    </div>
  );
}

function ClinicalContent({ animals, insumos, theme, onTreatment }: any) {
  const [search, setSearch] = useState('');
  const filtered = animals.filter((a: any) => a.arete.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-10 pt-10">
       <div className="flex justify-between items-center">
          <div><h2 className="text-4xl font-black font-display text-white">Salud & Bienestar</h2><p className="text-[10px] text-antique-brass uppercase font-black tracking-widest mt-1">Bitácora Médica Veterinaria</p></div>
          <div className="relative w-64">
            <input type="text" placeholder="Buscar animal..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white pl-10" />
            <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
          </div>
       </div>

       <div className="bg-clay/20 border border-white/5 rounded-[40px] overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-slate-950/50 text-[10px] font-black uppercase text-slate-500">
                <tr>
                   <th className="px-8 py-6">Animal</th>
                   <th className="px-8 py-6">Estatus</th>
                   <th className="px-8 py-6 text-right">Acción</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5 text-sm text-white font-bold">
                {filtered.map((a: any) => (
                   <tr key={a.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-[10px] font-display font-black">DP</div>
                         {a.arete}
                      </td>
                      <td className="px-8 py-6"><span className="px-2 py-1 bg-antique-brass/10 text-antique-brass rounded text-[10px]">{a.estatus}</span></td>
                      <td className="px-8 py-6 text-right">
                         <button onClick={() => onTreatment(a)} className="bg-saddle-tan/20 text-saddle-tan p-2 rounded-lg hover:bg-saddle-tan hover:text-white transition-all"><Syringe size={18} /></button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function StaffContent({ users, form, setForm, onAdd, onDelete, theme }: any) {
  return (
    <div className="space-y-10 pt-10">
       <div className="flex justify-between items-center">
          <div><h2 className="text-4xl font-black font-display text-white">Equipo de Trabajo</h2><p className="text-[10px] text-antique-brass uppercase font-black tracking-widest mt-1">Control de Accesos y Roles</p></div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 p-8 bg-clay/30 border border-white/5 rounded-[40px]">
             <h4 className="text-xl font-black font-display text-white mb-8 border-b border-white/5 pb-4 tracking-tight">Alta de Personal</h4>
             <div className="space-y-6">
                <input type="text" placeholder="Nombre Completo" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <input type="email" placeholder="Correo corporativo" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                <input type="password" placeholder="Contraseña Temporal" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                <button onClick={onAdd} className="w-full py-4 bg-antique-brass text-white font-black rounded-xl hover:bg-saddle-tan transition-all flex items-center justify-center gap-2"><UserPlus size={18} /> REGISTRAR</button>
             </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
             {users.map((u: any) => (
                <div key={u.id} className="p-6 bg-clay/20 border border-white/5 rounded-3xl flex justify-between items-center group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white"><CircleUser size={24} /></div>
                      <div>
                         <p className="text-white font-black">{u.name}</p>
                         <p className="text-[10px] text-slate-500 uppercase font-black">{u.role} • {u.email}</p>
                      </div>
                   </div>
                   <button onClick={() => onDelete(u.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
}

function ProfileContent({ theme, setTheme, onSecurity, onStaff, user, isDemo, setIsDemo, ToggleDemoMode }: any) {
  return (
      <div className="space-y-10 pt-10 animate-in fade-in duration-700">
          <div className="p-10 bg-clay/30 border border-white/5 rounded-[50px] flex justify-between items-center">
              <div className="flex items-center gap-10">
                  <div className="w-32 h-32 bg-saddle-tan rounded-[40px] flex items-center justify-center text-4xl text-white font-black font-display border-4 border-white/10 shadow-2xl">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-4xl text-white font-black font-display tracking-tight">{user?.name || 'Usuario'}</h3>
                    <p className="text-antique-brass font-black uppercase text-xs tracking-widest mt-1">{user?.role || 'Personal'} • {user?.email}</p>
                  </div>
              </div>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-8 py-4 bg-white/5 rounded-3xl text-white font-black flex items-center gap-4 hover:bg-white/10 transition-all">
                  {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />} <span>TEMA</span>
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div onClick={onSecurity} className="p-8 bg-clay/20 border border-white/5 rounded-[40px] cursor-pointer hover:bg-white/5 transition-all group">
                <Lock size={24} className="text-rose-500 mb-4 group-hover:scale-110 transition-transform" />
                <h4 className="text-white font-black uppercase text-xs tracking-widest">Seguridad</h4>
                <p className="text-[8px] text-slate-500 mt-1 uppercase font-bold">Cambiar Contraseña</p>
              </div>
              {user?.role === 'Admin' && (
                <div onClick={onStaff} className="p-8 bg-clay/20 border border-white/5 rounded-[40px] cursor-pointer hover:bg-white/5 transition-all group">
                  <Users size={24} className="text-antique-brass mb-4 group-hover:scale-110 transition-transform" />
                  <h4 className="text-white font-black uppercase text-xs tracking-widest">Personal</h4>
                  <p className="text-[8px] text-slate-500 mt-1 uppercase font-bold">Gestionar Equipo</p>
                </div>
              )}
          </div>
          
          {user?.role === 'Admin' && (
            <div className="mt-10 p-10 bg-clay/30 border border-white/5 rounded-[50px] flex justify-between items-center transition-all hover:bg-white/5">
                <div>
                   <h4 className="text-2xl font-black text-white italic font-serif flex items-center gap-3"><ShieldCheck className="text-antique-brass" /> Modo Demo (Lectura)</h4>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 max-w-md">Cuando está activo, el sistema bloquea todas las modificaciones en la base de datos. Ideal para pruebas y demostraciones.</p>
                </div>
                <button 
                  onClick={async () => {
                    const next = !isDemo;
                    await ToggleDemoMode(next);
                    setIsDemo(next);
                  }}
                  className={`px-10 py-5 rounded-[24px] font-black text-xs uppercase transition-all flex items-center gap-4 ${isDemo ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'bg-slate-800 text-slate-400'}`}
                >
                  {isDemo ? <Lock size={20} /> : <Shield size={20} />}
                  {isDemo ? 'DESACTIVAR MODO DEMO' : 'ACTIVAR MODO DEMO'}
                </button>
            </div>
          )}
      </div>
  );
}

function AnimalCard({ animal, theme, onSelect, onTreatment, onViewHistory, onEdit, onDelete, onAddWeight, onViewWeights }: any) {
  return (
    <div className="p-6 bg-clay/30 border border-white/5 rounded-[40px] relative group hover:scale-[1.02] transition-all">
       <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onAddWeight} className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg transition-all" title="Registrar Peso"><ArrowRightLeft size={14} className="rotate-90" /></button>
          <button onClick={onViewWeights} className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-lg transition-all" title="Historial de Pesos"><TrendingUp size={14} /></button>
          <button onClick={onEdit} className="p-2 bg-white/10 hover:bg-antique-brass text-white rounded-lg transition-all"><Edit3 size={14} /></button>
          <button onClick={onDelete} className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all"><Trash2 size={14} /></button>
       </div>
       <div className="flex justify-between mb-4">
          <div className="p-3 bg-slate-950 rounded-2xl"><Activity size={20} className="text-antique-brass" /></div>
          <div className="text-right pr-12"><p className="text-[10px] text-slate-500 font-bold uppercase">{animal.raza}</p><p className="text-white font-bold">{animal.sexo}</p></div>
       </div>
       <h4 className="text-3xl font-black font-display text-white mb-4 tracking-tight">{animal.arete}</h4>
       <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-slate-950 rounded-xl text-center"><p className="text-[8px] text-slate-500 uppercase font-black">Estatus</p><p className="text-[10px] text-emerald-400 font-bold truncate">{animal.estado_reproductivo}</p></div>
          <div className="p-3 bg-slate-950 rounded-xl text-center"><p className="text-[8px] text-slate-500 uppercase font-black">Corral</p><p className="text-[10px] text-white font-bold">{animal.corral_id}</p></div>
       </div>
       <div className="flex gap-2">
          <button onClick={onSelect} className="flex-1 bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-all flex justify-center" title="Confirmar Gestación"><Activity size={18} className="text-slate-400" /></button>
          <button onClick={onTreatment} className="flex-1 bg-rose-500/10 p-3 rounded-xl hover:bg-rose-500 transition-all flex justify-center" title="Tratamiento"><Syringe size={18} className="text-rose-500 group-hover:text-white" /></button>
          <button onClick={onViewHistory} className="flex-1 bg-blue-500/10 p-3 rounded-xl hover:bg-blue-500 transition-all flex justify-center" title="Ver Historial"><HistoryIcon size={18} className="text-blue-500 group-hover:text-white" /></button>
       </div>
    </div>
  );
}

function NextBirth({ id, date, progress }: any) {
  const percentage = Math.min(100, (progress / 150) * 100);
  return (
    <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5">
       <div className="flex justify-between text-xs font-black text-white mb-2"><span>{id}</span><span className="text-6666-cream">{date}</span></div>
       <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-6666-maroon" style={{ width: `${percentage}%` }} /></div>
    </div>
  );
}

function LoginView({ onLogin, loading, email, setEmail, password, setPassword }: any) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-950 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-6666-maroon/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-6666-cream/5 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/2" />
      
      <div className="w-full max-md p-10 bg-clay/50 backdrop-blur-3xl border border-white/10 rounded-[60px] shadow-3xl relative z-10 text-center mx-4 max-w-md">
        <div className="w-20 h-20 bg-6666-maroon rounded-[32px] rotate-12 flex items-center justify-center mx-auto mb-10 shadow-3xl shadow-6666-maroon/30 border border-white/10 overflow-hidden p-3">
          <img src="/logo.png" alt="Master Sheep Logo" className="w-full h-full object-contain -rotate-12" />
        </div>
        <h2 className="text-5xl font-black text-white font-display mb-12 tracking-tighter leading-none">MASTER<br /><span className="bg-gradient-to-r from-6666-cream to-6666-sand bg-clip-text text-transparent"> SHEEP PRO</span></h2>
        
        <div className="space-y-6 text-left">
           <input type="email" placeholder="Correo Corporativo" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold" value={email} onChange={e => setEmail(e.target.value)} />
           <input type="password" placeholder="Contraseña" className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold" value={password} onChange={e => setPassword(e.target.value)} />
           <button onClick={onLogin} disabled={loading} className="w-full py-5 bg-6666-maroon text-white rounded-[24px] font-black text-lg hover:bg-6666-sand hover:text-6666-maroon shadow-2xl shadow-6666-maroon/20 active:scale-95 transition-all">{loading ? '...' : 'ENTRAR AL SISTEMA'}</button>
        </div>
        <p className="mt-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-40">Acceso exclusivo - Master Sheep Pro</p>
      </div>
    </div>
  );
}

export default App;
