-- Borrar tablas si existen (Cuidado en producción)
DROP TABLE IF EXISTS public.movimientos;
DROP TABLE IF EXISTS public.eventos_reproductivos;
DROP TABLE IF EXISTS public.animales;
DROP TABLE IF EXISTS public.corrales;

-- 1. Tablas Base
CREATE TABLE public.corrales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    nombre TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('Engorda', 'Gestación', 'Lactancia', 'General')),
    capacidad INTEGER DEFAULT 0
);

CREATE TABLE public.animales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    arete TEXT NOT NULL,
    raza TEXT,
    sexo TEXT CHECK (sexo IN ('Macho', 'Hembra')),
    fecha_nacimiento DATE,
    estatus TEXT DEFAULT 'Activo' CHECK (estatus IN ('Activo', 'Vendido', 'Muerto')),
    estado_reproductivo TEXT DEFAULT 'Crecimiento' CHECK (estado_reproductivo IN ('Crecimiento', 'Vacía', 'Gestación', 'Lactancia', 'Pregñada Confirmada')),
    conteo_fetos INTEGER DEFAULT 0,
    corral_id UUID REFERENCES public.corrales(id),
    condicion_corporal DECIMAL(3,2) DEFAULT 0,
    peso_nacer DECIMAL(5,2) DEFAULT 0,
    peso_destete DECIMAL(5,2) DEFAULT 0,
    UNIQUE(user_id, arete)
);

CREATE TABLE public.eventos_reproductivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    animal_id UUID REFERENCES public.animales(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('Monta Natural', 'Inseminación Artificial')),
    fecha_evento DATE DEFAULT current_date,
    fecha_fin_monta DATE, -- Solo para Monta Natural
    id_macho TEXT,        -- Semental
    lote_semen TEXT,      -- Para IA
    tecnico TEXT,         -- Quién realizó la IA
    protocolo TEXT,       -- Protocolo de sincronización
    fecha_probable_parto DATE,
    resultado TEXT DEFAULT 'Pendiente',
    conteo_fetos INTEGER DEFAULT 0,
    notas TEXT
);

CREATE TABLE public.movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
    animal_id UUID REFERENCES public.animales(id) ON DELETE CASCADE,
    from_corral_id UUID REFERENCES public.corrales(id),
    to_corral_id UUID REFERENCES public.corrales(id),
    motivo TEXT
);

-- 2. Habilitar RLS
ALTER TABLE public.corrales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_reproductivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acceso (RLS)
-- Corrales
CREATE POLICY "Usuarios pueden gestionar sus corrales" ON public.corrales
    FOR ALL USING (auth.uid() = user_id);

-- Animales
CREATE POLICY "Usuarios pueden gestionar sus animales" ON public.animales
    FOR ALL USING (auth.uid() = user_id);

-- Eventos
CREATE POLICY "Usuarios pueden gestionar sus eventos" ON public.eventos_reproductivos
    FOR ALL USING (auth.uid() = user_id);

-- Movimientos
CREATE POLICY "Usuarios pueden gestionar sus movimientos" ON public.movimientos
    FOR ALL USING (auth.uid() = user_id);

-- 4. Triggers Útiles
-- Ejemplo: Al insertar una inseminación, actualizar automáticamente el estado de la borrega
CREATE OR REPLACE FUNCTION public.handle_new_insemination()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.animales 
    SET estado_reproductivo = 'Gestación'
    WHERE id = NEW.animal_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_insemination_event
    AFTER INSERT ON public.eventos_reproductivos
    FOR EACH ROW
    WHEN (NEW.tipo = 'Inseminación Artificial')
    EXECUTE FUNCTION public.handle_new_insemination();

-- 5. Datos Iniciales
INSERT INTO public.corrales (nombre, tipo, capacidad) VALUES 
('Corral Principal', 'General', 50),
('Corral Gestación', 'Gestación', 30),
('Corral Engorda', 'Engorda', 100);
