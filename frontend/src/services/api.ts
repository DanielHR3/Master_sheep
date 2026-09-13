import * as WailsApp from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";

const IS_WAILS = !!(window as any).go;
const TOKEN_KEY = 'sheepmaster_token';

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearAuthToken = () => localStorage.removeItem(TOKEN_KEY);

const authHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

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

  // 4. Último recurso: mismo origen web (ej: Cloud Run)
  return `${window.location.origin}/api`;
};


async function callApi(endpoint: string, method: string = 'GET', body?: any) {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMsg = 'Error en la petición API';
    try {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        errorMsg = parsed.error || parsed.message || errorMsg;
      } catch (_) {
        errorMsg = text || errorMsg;
      }
    } catch (_) {}
    throw new Error(errorMsg.trim());
  }

  const responseText = await response.text();
  if (!responseText || responseText.trim() === '') {
    return { success: true };
  }
  return JSON.parse(responseText);
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
  if (res.token) setAuthToken(res.token);
  return res.success;
};

export const Logout = async () => {
  if (!IS_WAILS) {
    try { await callApi('/logout', 'POST'); } catch (_) { /* best-effort */ }
    clearAuthToken();
  }
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

export const DeleteCorral = async (id: string) => {
  if (IS_WAILS) return WailsApp.DeleteCorral(id);
  return callApi(`/corrales?id=${encodeURIComponent(id)}`, 'DELETE');
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

export const GetHistorialClinicoGeneral = async () => {
  if (IS_WAILS && (WailsApp as any).GetHistorialClinico) {
    return (WailsApp as any).GetHistorialClinico("");
  }
  return callApi('/history');
};

export const GetSeguimientosPesoGeneral = async () => {
  if (IS_WAILS && (WailsApp as any).GetSeguimientosPeso) {
    return (WailsApp as any).GetSeguimientosPeso("");
  }
  return callApi('/weights');
};

export const GetEventosReproductivos = async () => {
  if (IS_WAILS && (WailsApp as any).GetEventosReproductivos) {
    return (WailsApp as any).GetEventosReproductivos();
  }
  return callApi('/reproduction-events');
};

export const RegistrarDiagnosticoGestacion = WailsApp.RegistrarDiagnosticoGestacion;
export const CrearRecetaVeterinaria = WailsApp.CrearRecetaVeterinaria;
export const GetRecetas = WailsApp.GetRecetas;

export const GetPartos = async (animalID: string = "") => {
  if (IS_WAILS && (WailsApp as any).GetPartos) {
    return (WailsApp as any).GetPartos(animalID);
  }
  const url = animalID ? `/births?animal_id=${animalID}` : '/births';
  return callApi(url);
};

export const GetDiagnosticosGestacion = WailsApp.GetDiagnosticosGestacion;

export const GetUsers = async () => {
  if (IS_WAILS) return WailsApp.GetUsers();
  return callApi('/users');
};

export const AddUser = async (user: any) => {
  if (IS_WAILS) return WailsApp.AddUser(user);
  return callApi('/users', 'POST', user);
};

export const UpdateUser = async (user: any) => {
  if (IS_WAILS) return WailsApp.UpdateUser(user);
  return callApi('/users', 'PUT', user);
};

export const DeleteUser = async (id: string) => {
  if (IS_WAILS) return WailsApp.DeleteUser(id);
  const baseUrl = getApiBaseUrl();
  await fetch(`${baseUrl}/users?id=${id}`, { method: 'DELETE', headers: authHeaders() });
};

export const UpdateAnimal = async (animal: any) => {
  if (IS_WAILS) return WailsApp.UpdateAnimal(animal);
  return callApi('/animals', 'PUT', animal);
};

export const DeleteAnimal = async (id: string) => {
  if (IS_WAILS) return WailsApp.DeleteAnimal(id);
  return callApi(`/animals?id=${id}`, 'DELETE');
};

export const GetCurrentUser = async () => {
  if (IS_WAILS) return WailsApp.GetCurrentUser();
  return callApi('/me');
};

export const ChangePassword = async (old: string, newP: string) => {
  if (IS_WAILS) return WailsApp.ChangePassword(old, newP);
  const res = await callApi('/change-password', 'POST', { old, new: newP });
  if (res.token) setAuthToken(res.token);
  return res;
};

export const AddSeguimientoPeso = async (data: any) => {
  if (IS_WAILS) return WailsApp.AddSeguimientoPeso(data);
  return callApi('/weights', 'POST', data);
};

export const GetSeguimientosPeso = async (animalID: string) => {
  if (IS_WAILS) return WailsApp.GetSeguimientosPeso(animalID);
  return callApi(`/weights?animal_id=${animalID}`);
};

export const ToggleDemoMode = async (enabled: boolean) => {
  if (IS_WAILS) return WailsApp.ToggleDemoMode(enabled);
  return callApi('/demo-mode', 'POST', { enabled });
};

export interface SyncStatus { pending: number; lastSync: string }

// En modo web/REST no hay cola local: los datos ya viven en Supabase.
const CLOUD_NATIVE_STATUS: SyncStatus = { pending: 0, lastSync: 'N/A' };

export const GetSyncStatus = async (): Promise<SyncStatus> => {
  if (IS_WAILS) return WailsApp.GetSyncStatus() as Promise<SyncStatus>;
  try {
    return (await callApi('/sync-status')) as SyncStatus; // escritorio en modo móvil: estado real
  } catch {
    return CLOUD_NATIVE_STATUS;
  }
};

// Fuerza un ciclo de sincronización local → nube y devuelve el estado.
export const SyncNow = async (): Promise<SyncStatus> => {
  if (IS_WAILS) return WailsApp.SyncNow() as Promise<SyncStatus>;
  try {
    return (await callApi('/sync-now', 'POST')) as SyncStatus;
  } catch {
    return CLOUD_NATIVE_STATUS;
  }
};

export const GetIsDemoMode = async () => {
  if (IS_WAILS) return WailsApp.GetIsDemoMode();
  const res = await callApi('/demo-mode');
  return res.enabled;
};

export const ImportAnimalsExcel = async (filePathOrFile: string | File): Promise<number> => {
  if (IS_WAILS) {
    if (typeof filePathOrFile !== 'string') {
      // In Wails desktop, we convert the HTML File to a byte array and send it to Go
      const file = filePathOrFile as File;
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      // Array.from converts it to a standard JS array of numbers, matching Go's []byte
      return (WailsApp.ImportAnimalsExcelData(Array.from(uint8Array)) as any);
    }
    return (WailsApp.ImportAnimalsExcel(filePathOrFile as string) as any);
  } else {
    const formData = new FormData();
    formData.append('file', filePathOrFile as File);
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/import-excel`, {
      method: 'POST',
      headers: authHeaders(),
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

// --- Landing pública (sin sesión) ---
export interface ContactPayload {
  nombre: string;
  rancho: string;
  telefono: string;
  correo: string;
  mensaje: string;
  quiere_demo: boolean;
  horario_preferido: string;
  website: string; // campo trampa: siempre vacío para humanos
}

export const SendContact = async (payload: ContactPayload): Promise<void> => {
  const res = await fetch(`${getApiBaseUrl()}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = 'No se pudo enviar tu mensaje.';
    try {
      msg = (await res.json()).error || msg;
    } catch {
      /* sin cuerpo JSON */
    }
    throw new Error(msg);
  }
};

export const GetLandingConfig = async (): Promise<{ bookingUrl: string }> => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/landing-config`);
    if (!res.ok) return { bookingUrl: '' };
    return await res.json();
  } catch {
    return { bookingUrl: '' };
  }
};

// Plantilla de carga masiva. En escritorio abre "Guardar como" y devuelve la
// ruta; en web descarga el archivo y devuelve "".
export const DownloadImportTemplate = async (): Promise<string> => {
  if (IS_WAILS) return WailsApp.ExportImportTemplate();
  const res = await fetch(`${getApiBaseUrl()}/import-template`, { headers: authHeaders() });
  if (!res.ok) throw new Error('No se pudo generar la plantilla.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_animales_sheepmaster.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return '';
};

// --- Genealogía / ficha ---
export const GetPedigree = async (animalId: string): Promise<main.PedigreeNode> => {
  if (IS_WAILS) return WailsApp.GetPedigree(animalId);
  return main.PedigreeNode.createFrom(await callApi(`/pedigree?id=${encodeURIComponent(animalId)}`));
};

export const GetAnimalesReferencia = async (): Promise<main.Animal[]> => {
  if (IS_WAILS) return WailsApp.GetAnimalesReferencia();
  const res = await callApi('/animals/referencias');
  return Array.isArray(res) ? res.map((r: any) => main.Animal.createFrom(r)) : [];
};

export const GetRanchoPerfil = async (): Promise<main.RanchoPerfil> => {
  if (IS_WAILS) return WailsApp.GetRanchoPerfil();
  return main.RanchoPerfil.createFrom(await callApi('/rancho-perfil'));
};

export const SaveRanchoPerfil = async (p: main.RanchoPerfil): Promise<void> => {
  if (IS_WAILS) return WailsApp.SaveRanchoPerfil(p);
  await callApi('/rancho-perfil', 'PUT', p);
};

// Ficha genealógica en PDF. En escritorio abre "Guardar como" y devuelve la
// ruta; en web descarga el archivo y devuelve "".
export const DownloadFicha = async (animalId: string, arete: string): Promise<string> => {
  if (IS_WAILS) return WailsApp.ExportFichaGenealogica(animalId);
  const res = await fetch(`${getApiBaseUrl()}/animals/${encodeURIComponent(animalId)}/ficha`, { headers: authHeaders() });
  if (!res.ok) {
    let msg = 'No se pudo generar la ficha.';
    try { msg = (await res.json()).error || msg; } catch { /* sin cuerpo */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ficha_${(arete || animalId).replace(/[\/\\ ]/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return '';
};

// Semáforo del hato (predicciones por animal).
export const GetSemaforoHato = async (): Promise<main.SemaforoAnimal[]> => {
  if (IS_WAILS) return WailsApp.GetSemaforoHato();
  const res = await callApi('/semaforo');
  return Array.isArray(res) ? res.map((r: any) => main.SemaforoAnimal.createFrom(r)) : [];
};
