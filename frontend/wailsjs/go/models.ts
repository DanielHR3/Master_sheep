export namespace main {
	
	export class Animal {
	    id: string;
	    arete: string;
	    raza: string;
	    sexo: string;
	    fecha_nacimiento: string;
	    estatus: string;
	    estado_reproductivo: string;
	    corral_id: string;
	    conteo_fetos: number;
	    condicion_corporal: number;
	    peso_nacer: number;
	    peso_destete: number;
	    padre_id: string;
	    madre_id: string;
	    destino: string;
	    fecha_defuncion: string;
	    motivo_defuncion: string;
	
	    static createFrom(source: any = {}) {
	        return new Animal(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.arete = source["arete"];
	        this.raza = source["raza"];
	        this.sexo = source["sexo"];
	        this.fecha_nacimiento = source["fecha_nacimiento"];
	        this.estatus = source["estatus"];
	        this.estado_reproductivo = source["estado_reproductivo"];
	        this.corral_id = source["corral_id"];
	        this.conteo_fetos = source["conteo_fetos"];
	        this.condicion_corporal = source["condicion_corporal"];
	        this.peso_nacer = source["peso_nacer"];
	        this.peso_destete = source["peso_destete"];
	        this.padre_id = source["padre_id"];
	        this.madre_id = source["madre_id"];
	        this.destino = source["destino"];
	        this.fecha_defuncion = source["fecha_defuncion"];
	        this.motivo_defuncion = source["motivo_defuncion"];
	    }
	}
	export class Corral {
	    id: string;
	    nombre: string;
	    tipo: string;
	    capacidad: number;
	
	    static createFrom(source: any = {}) {
	        return new Corral(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.nombre = source["nombre"];
	        this.tipo = source["tipo"];
	        this.capacidad = source["capacidad"];
	    }
	}
	export class DiagnosticoGestacion {
	    id: string;
	    animal_id: string;
	    fecha: string;
	    condicion_corporal: number;
	    resultado: number;
	    conteo_fetos: number;
	    observaciones: string;
	
	    static createFrom(source: any = {}) {
	        return new DiagnosticoGestacion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.animal_id = source["animal_id"];
	        this.fecha = source["fecha"];
	        this.condicion_corporal = source["condicion_corporal"];
	        this.resultado = source["resultado"];
	        this.conteo_fetos = source["conteo_fetos"];
	        this.observaciones = source["observaciones"];
	    }
	}
	export class EventoReproductivo {
	    id: string;
	    animal_id: string;
	    tipo: string;
	    fecha_evento: string;
	    fecha_fin_monta?: string;
	    id_macho: string;
	    lote_semen?: string;
	    tecnico?: string;
	    protocolo?: string;
	    fecha_probable_parto: string;
	    conteo_fetos: number;
	    resultado: string;
	    notas: string;
	
	    static createFrom(source: any = {}) {
	        return new EventoReproductivo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.animal_id = source["animal_id"];
	        this.tipo = source["tipo"];
	        this.fecha_evento = source["fecha_evento"];
	        this.fecha_fin_monta = source["fecha_fin_monta"];
	        this.id_macho = source["id_macho"];
	        this.lote_semen = source["lote_semen"];
	        this.tecnico = source["tecnico"];
	        this.protocolo = source["protocolo"];
	        this.fecha_probable_parto = source["fecha_probable_parto"];
	        this.conteo_fetos = source["conteo_fetos"];
	        this.resultado = source["resultado"];
	        this.notas = source["notas"];
	    }
	}
	export class Insumo {
	    id: string;
	    nombre: string;
	    tipo: string;
	    unidad: string;
	    stock_actual: number;
	    stock_minimo: number;
	    costo_unitario: number;
	    dias_retiro: number;
	    lote: string;
	    fecha_vencimiento: string;
	    proveedor: string;
	
	    static createFrom(source: any = {}) {
	        return new Insumo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.nombre = source["nombre"];
	        this.tipo = source["tipo"];
	        this.unidad = source["unidad"];
	        this.stock_actual = source["stock_actual"];
	        this.stock_minimo = source["stock_minimo"];
	        this.costo_unitario = source["costo_unitario"];
	        this.dias_retiro = source["dias_retiro"];
	        this.lote = source["lote"];
	        this.fecha_vencimiento = source["fecha_vencimiento"];
	        this.proveedor = source["proveedor"];
	    }
	}
	export class Parto {
	    id: string;
	    animal_id: string;
	    fecha: string;
	    cantidad_crias: number;
	    tipo_parto: string;
	    observaciones: string;
	
	    static createFrom(source: any = {}) {
	        return new Parto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.animal_id = source["animal_id"];
	        this.fecha = source["fecha"];
	        this.cantidad_crias = source["cantidad_crias"];
	        this.tipo_parto = source["tipo_parto"];
	        this.observaciones = source["observaciones"];
	    }
	}
	export class RecetaVeterinaria {
	    id: string;
	    animal_id: string;
	    mvz: string;
	    productor: string;
	    fecha: string;
	    peso: number;
	    diagnostico: string;
	    tratamiento: string;
	
	    static createFrom(source: any = {}) {
	        return new RecetaVeterinaria(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.animal_id = source["animal_id"];
	        this.mvz = source["mvz"];
	        this.productor = source["productor"];
	        this.fecha = source["fecha"];
	        this.peso = source["peso"];
	        this.diagnostico = source["diagnostico"];
	        this.tratamiento = source["tratamiento"];
	    }
	}
	export class SeguimientoPeso {
	    id: string;
	    animal_id: string;
	    fecha: string;
	    peso: number;
	    notas: string;
	
	    static createFrom(source: any = {}) {
	        return new SeguimientoPeso(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.animal_id = source["animal_id"];
	        this.fecha = source["fecha"];
	        this.peso = source["peso"];
	        this.notas = source["notas"];
	    }
	}
	export class Tarea {
	    id: string;
	    asignado_a: string;
	    creado_por: string;
	    titulo: string;
	    descripcion: string;
	    estatus: string;
	    fecha_vencimiento: string;
	    animal_id?: string;
	    insumo_id?: string;
	    prioridad: string;
	
	    static createFrom(source: any = {}) {
	        return new Tarea(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.asignado_a = source["asignado_a"];
	        this.creado_por = source["creado_por"];
	        this.titulo = source["titulo"];
	        this.descripcion = source["descripcion"];
	        this.estatus = source["estatus"];
	        this.fecha_vencimiento = source["fecha_vencimiento"];
	        this.animal_id = source["animal_id"];
	        this.insumo_id = source["insumo_id"];
	        this.prioridad = source["prioridad"];
	    }
	}
	export class Tratamiento {
	    id: string;
	    animal_id: string;
	    insumo_id: string;
	    dosis: number;
	    via_administracion: string;
	    duracion_dias: number;
	    fecha: string;
	    fecha_fin_retiro: string;
	    tecnico: string;
	    observaciones: string;
	
	    static createFrom(source: any = {}) {
	        return new Tratamiento(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.animal_id = source["animal_id"];
	        this.insumo_id = source["insumo_id"];
	        this.dosis = source["dosis"];
	        this.via_administracion = source["via_administracion"];
	        this.duracion_dias = source["duracion_dias"];
	        this.fecha = source["fecha"];
	        this.fecha_fin_retiro = source["fecha_fin_retiro"];
	        this.tecnico = source["tecnico"];
	        this.observaciones = source["observaciones"];
	    }
	}
	export class User {
	    id: string;
	    email: string;
	    name: string;
	    password?: string;
	    role: string;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.email = source["email"];
	        this.name = source["name"];
	        this.password = source["password"];
	        this.role = source["role"];
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

