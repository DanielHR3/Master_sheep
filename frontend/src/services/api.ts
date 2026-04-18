import * as WailsApp from "../../wailsjs/go/main/App";

const IS_WAILS = !!(window as any).go;

export const getApiBaseUrl = () => {
  // 1. Si el usuario configuró manualmente una URL, esa tiene prioridad total
  const saved = localStorage.getItem('backend_url');
  if (saved && saved.trim() !== '') {
    let base = saved.trim();
    if (!base.startsWith('http')) {
      base = `https://${base}`;
    }
    base = base.replace(/\/api\/?$/, '');
    return `${base}/api`;
  }

  const host = window.location.hostname;

  // 2. Desarrollo local
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://localhost:8080/api`;
  }

  // 3. Producción en la nube: variable de entorno definida en el build
  const backendUrl = import.meta.env.VITE_API_URL;
  if (backendUrl) {
    return `${backendUrl}/api`;
  }

  // 4. Último recurso: mismo host, puerto 8080
  const protocol = window.location.protocol;
  return `${protocol}//${host}:8080/api`;
};

async function callApi(endpoint: string, method: string = 'GET', body?: any) {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en la petición API');
  }

  return response.json();
}

// --- Funciones de la API ---
export const GetAnimales = async () => {
  if (IS_WAILS) return WailsApp.GetAnimales();
  return callApi('/animals');
};

export const GetStats = async () => {
  if (IS_WAILS) return WailsApp.GetStats();
  return callApi('/stats');
};

export const Login = async (email: string, pass: string) => {
  if (IS_WAILS) return WailsApp.Login(email, pass);
  const res = await callApi('/login', 'POST', { email, password: pass });
  return res.success;
};

export const AddAnimal = async (animal: any) => {
  if (IS_WAILS) return WailsApp.AddAnimal(animal);
  return callApi('/animals', 'POST', animal);
};

export const GetCorrales = async () => {
  if (IS_WAILS) return WailsApp.GetCorrales();
  return callApi('/corrales');
};

export const RegistrarEventoReproductivo = async (event: any) => {
  if (IS_WAILS) return WailsApp.RegistrarEventoReproductivo(event);
  return callApi('/reproduction', 'POST', event);
};

export const RegistrarTratamiento = async (treatment: any) => {
  if (IS_WAILS) return WailsApp.RegistrarTratamiento(treatment);
  return callApi('/treatments', 'POST', treatment);
};

export const GetTareas = async () => {
  if (IS_WAILS) return WailsApp.GetTareas();
  return callApi('/tasks');
};

export const AddTarea = async (task: any) => {
  if (IS_WAILS) return WailsApp.AddTarea(task);
  return callApi('/tasks', 'POST', task);
};

export const RegistrarParto = async (parto: any) => {
  if (IS_WAILS) return WailsApp.RegistrarParto(parto);
  return callApi('/births', 'POST', parto);
};

export const ConfirmarUltrasonido = async (animalID: string, preñada: boolean, fetos: number) => {
  if (IS_WAILS) return WailsApp.ConfirmarUltrasonido(animalID, preñada, fetos);
  return callApi('/confirm-ultrasound', 'POST', { animal_id: animalID, preñada, fetos });
};

export const AddCorral = async (corral: any) => {
  if (IS_WAILS) return WailsApp.AddCorral(corral);
  return callApi('/corrales', 'POST', corral);
};

export const GetInsumos = async () => {
  if (IS_WAILS) return WailsApp.GetInsumos();
  return callApi('/insumos');
};

export const AddInsumo = async (insumo: any) => {
  if (IS_WAILS) return WailsApp.AddInsumo(insumo);
  return callApi('/insumos', 'POST', insumo);
};

export const CompletarTarea = async (id: string) => {
  if (IS_WAILS) return WailsApp.CompletarTarea(id);
  return;
};

export const GetHistorialClinico = async (animalID: string) => {
  if (IS_WAILS) return WailsApp.GetHistorialClinico(animalID);
  return callApi(`/history?animal_id=${animalID}`);
};

export const RegistrarDiagnosticoGestacion = WailsApp.RegistrarDiagnosticoGestacion;
export const CrearRecetaVeterinaria = WailsApp.CrearRecetaVeterinaria;
export const GetRecetas = WailsApp.GetRecetas;
export const GetPartos = WailsApp.GetPartos;
export const GetDiagnosticosGestacion = WailsApp.GetDiagnosticosGestacion;

export const GetUsers = async () => {
  if (IS_WAILS) return WailsApp.GetUsers();
  return callApi('/users');
};

export const AddUser = async (user: any) => {
  if (IS_WAILS) return WailsApp.AddUser(user);
  return callApi('/users', 'POST', user);
};

export const DeleteUser = async (id: string) => {
  if (IS_WAILS) return WailsApp.DeleteUser(id);
  const baseUrl = getApiBaseUrl();
  await fetch(`${baseUrl}/users?id=${id}`, { method: 'DELETE' });
};

export const UpdateAnimal = async (animal: any) => {
  if (IS_WAILS) return WailsApp.UpdateAnimal(animal);
  return callApi('/animals', 'POST', animal);
};

export const DeleteAnimal = async (id: string) => {
  if (IS_WAILS) return WailsApp.DeleteAnimal(id);
  return;
};

export const GetCurrentUser = async () => {
  if (IS_WAILS) return WailsApp.GetCurrentUser();
  return callApi('/me');
};

export const ChangePassword = async (old: string, newP: string) => {
  if (IS_WAILS) return WailsApp.ChangePassword(old, newP);
  return callApi('/change-password', 'POST', { old, new: newP });
};

export const AddSeguimientoPeso = async (data: any) => {
  if (IS_WAILS) return WailsApp.AddSeguimientoPeso(data);
  return callApi('/weights', 'POST', data);
};

export const GetSeguimientosPeso = async (animalID: string) => {
  if (IS_WAILS) return WailsApp.GetSeguimientosPeso(animalID);
  return callApi(`/weights?animal_id=${animalID}`);
};

export const ToggleDemoMode = WailsApp.ToggleDemoMode;

export const GetIsDemoMode = async () => {
  if (IS_WAILS) return WailsApp.GetIsDemoMode();
  const res = await callApi('/demo-mode');
  return res.enabled;
};

export const ImportAnimalsExcel = async (filePathOrFile: string | File): Promise<number> => {
  if (IS_WAILS) {
    return (WailsApp.ImportAnimalsExcel(filePathOrFile as string) as any);
  } else {
    const formData = new FormData();
    formData.append('file', filePathOrFile as File);
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/import-excel`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error en importación');
    }
    const data = await res.json();
    return data.count;
  }
};
