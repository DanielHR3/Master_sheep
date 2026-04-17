import * as WailsApp from "../../wailsjs/go/main/App";

const IS_WAILS = !!(window as any).go;

export const getApiBaseUrl = () => {
  const saved = localStorage.getItem('backend_url');
  if (saved) {
    // Ensure it ends with /api but avoid double /api
    const base = saved.replace(/\/api\/?$/, '');
    return `${base}/api`;
  }
  return `http://${window.location.hostname}:8080/api`;
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

// Abstracción de funciones
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

// ... Mapeo de compatibilidad para el resto (estos llamarán a Wails si están en PC)
export const ConfirmarUltrasonido = WailsApp.ConfirmarUltrasonido;
export const AddCorral = WailsApp.AddCorral;
export const GetInsumos = WailsApp.GetInsumos;
export const AddInsumo = WailsApp.AddInsumo;
export const CompletarTarea = WailsApp.CompletarTarea;
export const GetHistorialClinico = WailsApp.GetHistorialClinico;
export const RegistrarDiagnosticoGestacion = WailsApp.RegistrarDiagnosticoGestacion;
export const CrearRecetaVeterinaria = WailsApp.CrearRecetaVeterinaria;
export const GetRecetas = WailsApp.GetRecetas;
export const GetPartos = WailsApp.GetPartos;
export const GetDiagnosticosGestacion = WailsApp.GetDiagnosticosGestacion;
export const GetUsers = WailsApp.GetUsers;
export const AddUser = WailsApp.AddUser;
export const DeleteUser = WailsApp.DeleteUser;
export const UpdateAnimal = WailsApp.UpdateAnimal;
export const DeleteAnimal = WailsApp.DeleteAnimal;
export const GetCurrentUser = WailsApp.GetCurrentUser;
export const ChangePassword = WailsApp.ChangePassword;
export const AddSeguimientoPeso = WailsApp.AddSeguimientoPeso;
export const GetSeguimientosPeso = WailsApp.GetSeguimientosPeso;
export const ToggleDemoMode = WailsApp.ToggleDemoMode;
export const GetIsDemoMode = WailsApp.GetIsDemoMode;
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
