// Todo el texto de la landing en un solo lugar (spec §3 y §8).
export const CONTACT_EMAIL = 'danielhrubio3@gmail.com';

export const hero = {
  eyebrow: 'Gestión ovina para el corral, no para la oficina',
  title: 'Registra en el corral sin señal.',
  titleAccent: 'Se respalda solo al llegar a casa.',
  subtitle:
    'Pesajes, tratamientos, reproducción y genealogía de tu hato ovino en tu celular y tu computadora. Hecho a la medida de cómo trabaja tu rancho.',
  primary: 'Agenda una demo',
  secondary: 'Ver cómo funciona',
  caption: 'Registro de pesaje en el inventario del hato. Grabación real de la app.',
};

export const tailored = {
  title: 'A la medida de tu rancho',
  subtitle: 'El mismo sistema cubre engorda y pie de cría, con pantallas y reglas distintas para cada uno. Tú decides cuáles necesitas.',
  cards: [
    {
      tag: 'Engorda',
      example: 'Para un rancho de engorda',
      image: '/landing/engorda.png',
      points: [
        'Sabes qué borregos ya dan el peso y la edad de venta, hoy.',
        'No gastas alimento en animales que ya deberían salir.',
        'Ocupación de corrales de un vistazo para evitar hacinamiento.',
      ],
    },
    {
      tag: 'Pie de cría',
      example: 'Para un rancho de pie de cría',
      image: '/landing/cria.png',
      points: [
        'Padres, abuelos y método de concepción de cada animal.',
        'Alertas de destete y de pesaje a los 150 días.',
        'Diagnóstico de gestación y partos con todo el historial.',
      ],
    },
  ],
};

export type FeatureItem = {
  title: string;
  text: string;
  video?: string;
  poster?: string;
  image?: string;
};

export const features: { title: string; items: FeatureItem[] } = {
  title: 'Lo que ves cada mañana',
  items: [
    {
      title: 'Semáforo de venta',
      text: 'Rojo: ya alcanzó peso y edad, sácalo. Amarillo: prepara el transporte. Verde: sigue creciendo. Sin calculadora ni libreta.',
      video: '/landing/semaforo.mp4',
      poster: '/landing/semaforo.jpg',
    },
    {
      title: 'Agenda sanitaria con periodo de retiro',
      text: 'Cada tratamiento marca hasta cuándo el animal no puede venderse. Los recordatorios de dosis se generan solos y aparecen en la agenda del día.',
      image: '/landing/agenda.png',
    },
    {
      title: 'Árbol genealógico',
      text: 'Toca un animal y ve a sus padres y abuelos. Para decidir cruzas y vender pie de cría con respaldo.',
      image: '/landing/genealogia.png',
    },
  ],
};

export const about = {
  title: 'Quiénes somos',
  line: 'Plataforma agrotech desarrollada en México para ranchos ovinos.',
  blocks: [
    {
      title: 'Misión',
      text: 'Poner en manos de los ranchos ovinos de México una herramienta que funcione donde están los animales, sin internet ni complicaciones, para que cada decisión de venta, salud y cría se tome con datos y no de memoria.',
    },
    {
      title: 'Visión',
      text: 'Ser la plataforma de referencia para la ganadería ovina en Latinoamérica: un sistema que se adapta a cada rancho, crece con él y convierte la libreta del corral en la base de un negocio rentable.',
    },
    {
      title: 'Objetivo',
      text: 'Que ningún borrego listo para venta se quede en el corral, que ningún tratamiento se olvide y que cada animal tenga su historia completa, desde sus abuelos hasta su último pesaje.',
    },
  ],
  values: [
    { title: 'Sencillez', text: 'Si no se entiende con guantes puestos y sol de frente, no sirve.' },
    { title: 'A la medida', text: 'Cada rancho trabaja distinto; el sistema se ajusta al rancho, no al revés.' },
    { title: 'Confiabilidad', text: 'Los datos se guardan primero en tu equipo y se respaldan solos; nunca dependes de la señal.' },
    { title: 'Cercanía', text: 'Te capacitamos en persona y respondemos cuando lo necesitas.' },
  ],
};

export const steps = {
  title: 'Cómo empezamos',
  items: [
    { n: '1', title: 'Ajustamos el sistema', text: 'Lo configuramos a la forma de trabajar de tu rancho: engorda, pie de cría o ambos.' },
    { n: '2', title: 'Pasamos tu información', text: 'Tu libreta o tu Excel entran al sistema; no empiezas de cero.' },
    { n: '3', title: 'Capacitamos a tu equipo', text: 'En menos de una hora tu gente registra desde el corral.' },
  ],
};

export const contact = {
  title: 'Platiquemos de tu rancho',
  subtitle: 'Cuéntanos cuántos animales manejas y qué te quita el sueño. Te escribimos en menos de 24 horas.',
  demoCard: {
    title: '¿Prefieres verlo en vivo?',
    text: 'Agendamos una demo de 30 minutos por videollamada, con tus preguntas y tu tipo de rancho.',
    button: 'Agenda una demo',
  },
  success: 'Recibido. Te escribimos en menos de 24 horas.',
};
