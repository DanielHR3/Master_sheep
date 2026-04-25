import { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/useStore';
import { main } from "../../wailsjs/go/models";
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
  ImportAnimalsExcel,
  SyncToJarvis
} from "../services/api";

export const useAppLogic = () => {
  const store = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States (Local to hook/app logic)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [animalForm, setAnimalForm] = useState({ 
    arete: '', 
    raza: 'Dorper', 
    sexo: 'Hembra', 
    corral: '', 
    peso: '', 
    fecha_nacimiento: new Date().toISOString().split('T')[0], 
    padre_id: '', 
    madre_id: '', 
    destino: 'Engorda' 
  });
  
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
  const [changePasswordForm, setChangePasswordForm] = useState({ old: '', new: '', confirm: '' });
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

  // Modal Control (moved to store for global access, but kept here for logical grouping)
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
  const [showEditAnimal, setShowEditAnimal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (store.isLoggedIn) {
      refreshData();
      const interval = setInterval(refreshData, 30000);
      return () => clearInterval(interval);
    }
  }, [store.isLoggedIn]);

  const refreshData = async () => {
    try {
      const [s, a, c, i, t, cur] = await Promise.all([
        GetStats(),
        GetAnimales(),
        GetCorrales(),
        GetInsumos(),
        GetTareas(),
        GetCurrentUser()
      ]);
      
      // GetUsers puede fallar si no es admin, así que lo manejamos aparte para no romper todo
      let u = [];
      try {
        u = await GetUsers() || [];
      } catch (e) {
        console.warn("Usuario no tiene permisos para ver staff", e);
      }

      store.setStats(s);
      store.setAnimals(a || []);
      store.setCorrales(c || []);
      store.setInsumos(i || []);
      store.setTareas(t || []);
      store.setUsers(u);
      store.setCurrentUser(cur);
      
      const demo = await GetIsDemoMode();
      store.setIsDemo(demo);
    } catch (err: any) {
      const errMsg = err?.toString() || "";
      // Solo hacer logout si NO está autenticado. "no autorizado" significa falta de rol, no falta de cuenta.
      if (errMsg.includes("no autenticado")) {
        store.setIsLoggedIn(false);
      } else {
        console.error("Error al refrescar datos:", err);
      }
    }
  };

  const handleLogin = async () => {
    store.setNotification(null); // Limpiar notificaciones previas
    store.setLoading(true);
    try {
      await Login(email, password);
      store.setIsLoggedIn(true);
      refreshData();
    } catch (err: any) {
      console.error("Login error:", err);
      let errorMsg = "Error de autenticación. Verifique sus credenciales.";
      
      const rawError = err?.toString() || "";
      if (rawError.includes("Failed to fetch") || rawError.includes("NAME_NOT_RESOLVED") || rawError.includes("network")) {
         errorMsg = "No se pudo conectar al servidor. Verifica tu conexión o limpia la caché (Botón rojo abajo).";
      }

      store.setNotification({ message: errorMsg, type: 'error' });
    } finally {
      store.setLoading(false);
    }
  };

  const handleLogout = () => {
    store.setIsLoggedIn(false);
    // Optional: Clear additional state if needed
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

      await RegistrarTratamiento(t);

      const insumoNombre = store.insumos.find(i => i.id === treatmentForm.insumo_id)?.nombre || "Medicamento";
      if (treatmentForm.duracion > 1) {
        for (let i = 1; i < treatmentForm.duracion; i++) {
          const reminderDate = new Date();
          reminderDate.setDate(reminderDate.getDate() + i);
          
          const tarea = main.Tarea.createFrom({
            titulo: `REMINDER: Continuar ${insumoNombre} (${treatmentForm.dosis}${store.insumos.find(ins => ins.id === treatmentForm.insumo_id)?.unidad || 'ml'}) - ${selectedAnimal.arete}`,
            descripcion: `Administrar dosis de refuerzo de ${insumoNombre} vía ${treatmentForm.via}. Observaciones originales: ${treatmentForm.observaciones}`,
            prioridad: 'Alta',
            estatus: 'Pendiente',
            responsable_id: '',
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

  const handleRegisterBreeding = async () => {
    if (!breedingForm.animal_id) return alert("Seleccione un animal");
    try {
      await RegistrarEventoReproductivo(main.EventoReproductivo.createFrom(breedingForm)); 
      alert("Evento registrado con éxito");
      refreshData(); 
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      store.setLoading(true);
      const result = await ImportAnimalsExcel(file);
      alert(`Éxito: Se han importado ${result} registros correctamente.`);
      refreshData();
    } catch (err: any) {
      alert("Error: " + err);
    } finally {
      store.setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return {
    state: {
      email, setEmail,
      password, setPassword,
      animalForm, setAnimalForm,
      corralForm, setCorralForm,
      treatmentForm, setTreatmentForm,
      usuarioForm, setUsuarioForm,
      insumoForm, setInsumoForm,
      editAnimalForm, setEditAnimalForm,
      changePasswordForm, setChangePasswordForm,
      breedingForm, setBreedingForm,
      partoForm, setPartoForm,
      weightForm, setWeightForm,
      selectedAnimal, setSelectedAnimal,
      weightHistory, setWeightHistory,
      modals: {
        showAddAnimal, setShowAddAnimal,
        showAddInsumo, setShowAddInsumo,
        showAddCorral, setShowAddCorral,
        showTreatment, setShowTreatment,
        showHistory, setShowHistory,
        showConfirmModal, setShowConfirmModal,
        showPartoModal, setShowPartoModal,
        showWeightModal, setShowWeightModal,
        showWeightHistory, setShowWeightHistory,
        showEditAnimal, setShowEditAnimal,
        showChangePassword, setShowChangePassword,
      }
    },
    actions: {
      refreshData,
      handleLogin,
      handleLogout,
      handleAddAnimal,
      handleDeleteAnimal,
      handleUpdateAnimal,
      handleAddInsumo,
      handleAddCorral,
      handleRegisterTreatment,
      handleRegisterParto,
      handleRegisterBreeding,
      handleAddWeight,
      handleViewWeights,
      handleAddUser,
      handleDeleteUser,
      handleFileChange,
      toggleTheme: () => store.setTheme(store.theme === 'dark' ? 'light' : 'dark'),
      handleImportExcel: () => fileInputRef.current?.click(),
      handleSyncToJarvis: async () => {
        try {
          store.setLoading(true);
          const result = await SyncToJarvis();
          store.setNotification({ message: result, type: 'success' });
        } catch (err: any) {
          store.setNotification({ message: "Error: " + err, type: 'error' });
        } finally {
          store.setLoading(false);
        }
      },
      handleConfirmUltrasound: async (result: string) => {
        if (!selectedAnimal) return;
        try {
          await ConfirmarUltrasonido(selectedAnimal.id, result);
          setShowConfirmModal(false);
          refreshData();
        } catch (err) {
          alert("Error al confirmar ultrasonido");
        }
      },
      handleChangePassword: async () => {
        if (changePasswordForm.new !== changePasswordForm.confirm) {
          return alert("Las contraseñas no coinciden");
        }
        try {
          await ChangePassword(changePasswordForm.old, changePasswordForm.new);
          setShowChangePassword(false);
          setChangePasswordForm({ old: '', new: '', confirm: '' });
          alert("Contraseña actualizada con éxito");
        } catch (err) {
          alert("Error: " + err);
        }
      }
    },
    refs: {
      fileInputRef
    }
  };
};
