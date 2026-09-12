export namespace main {
	
	export class Animal {
	    id: string;
	    especie: string;
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
	    abuelo_paterno_id: string;
	    abuela_paterna_id: string;
	    abuelo_materno_id: string;
	    abuela_materna_id: string;
	    tipo_parto: string;
	    metodo_concepcion: string;
	    tipo_nacimiento: string;
	    es_referencia: boolean;
	    nombre: string;
	    tatuaje_der: string;
	    tatuaje_izq: string;
	    tatuaje_cola: string;
	    color: string;
	    pureza: number;
	    grado_registro: string;
	    registro: string;
	    siniiga: string;
	    id_electronica: string;
	    destino: string;
	    fecha_defuncion: string;
	    motivo_defuncion: string;
	    fecha_destete: string;
	    peso_150_dias: number;
	    foto: string;
	
	    static createFrom(source: any = {}) {
	        return new Animal(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.especie = source["especie"];
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
	        this.abuelo_paterno_id = source["abuelo_paterno_id"];
	        this.abuela_paterna_id = source["abuela_paterna_id"];
	        this.abuelo_materno_id = source["abuelo_materno_id"];
	        this.abuela_materna_id = source["abuela_materna_id"];
	        this.tipo_parto = source["tipo_parto"];
	        this.metodo_concepcion = source["metodo_concepcion"];
	        this.tipo_nacimiento = source["tipo_nacimiento"];
	        this.es_referencia = source["es_referencia"];
	        this.nombre = source["nombre"];
	        this.tatuaje_der = source["tatuaje_der"];
	        this.tatuaje_izq = source["tatuaje_izq"];
	        this.tatuaje_cola = source["tatuaje_cola"];
	        this.color = source["color"];
	        this.pureza = source["pureza"];
	        this.grado_registro = source["grado_registro"];
	        this.registro = source["registro"];
	        this.siniiga = source["siniiga"];
	        this.id_electronica = source["id_electronica"];
	        this.destino = source["destino"];
	        this.fecha_defuncion = source["fecha_defuncion"];
	        this.motivo_defuncion = source["motivo_defuncion"];
	        this.fecha_destete = source["fecha_destete"];
	        this.peso_150_dias = source["peso_150_dias"];
	        this.foto = source["foto"];
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
	    rancho_id: string;
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
	        this.rancho_id = source["rancho_id"];
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


	export class PedigreeNode {
	    id: string;
	    arete: string;
	    nombre: string;
	    registro: string;
	    grado_registro: string;
	    raza: string;
	    pureza: number;
	    sexo: string;
	    foto: string;
	    es_referencia: boolean;
	    existe: boolean;
	    padre?: PedigreeNode;
	    madre?: PedigreeNode;

	    static createFrom(source: any = {}) {
	        return new PedigreeNode(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.arete = source["arete"];
	        this.nombre = source["nombre"];
	        this.registro = source["registro"];
	        this.grado_registro = source["grado_registro"];
	        this.raza = source["raza"];
	        this.pureza = source["pureza"];
	        this.sexo = source["sexo"];
	        this.foto = source["foto"];
	        this.es_referencia = source["es_referencia"];
	        this.existe = source["existe"];
	        this.padre = source["padre"] ? new PedigreeNode(source["padre"]) : undefined;
	        this.madre = source["madre"] ? new PedigreeNode(source["madre"]) : undefined;
	    }
	}
	export class RanchoPerfil {
	    rancho_id: string;
	    nombre: string;
	    criador_clave: string;
	    criador_nombre: string;
	    criador_centro: string;
	    criador_municipio_estado: string;
	    propietario_clave: string;
	    propietario_nombre: string;
	    propietario_centro: string;
	    propietario_municipio_estado: string;
	    logo: string;

	    static createFrom(source: any = {}) {
	        return new RanchoPerfil(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rancho_id = source["rancho_id"];
	        this.nombre = source["nombre"];
	        this.criador_clave = source["criador_clave"];
	        this.criador_nombre = source["criador_nombre"];
	        this.criador_centro = source["criador_centro"];
	        this.criador_municipio_estado = source["criador_municipio_estado"];
	        this.propietario_clave = source["propietario_clave"];
	        this.propietario_nombre = source["propietario_nombre"];
	        this.propietario_centro = source["propietario_centro"];
	        this.propietario_municipio_estado = source["propietario_municipio_estado"];
	        this.logo = source["logo"];
	    }
	}

}
