// Genera las láminas que se intercalan en el video del hero de la landing.
//
// La portada salió de Canva; estas tres replican su estilo para que la
// secuencia se vea pareja. Se hacen aquí y no en Canva porque cada generación
// suelta elige su propia tipografía y composición, y en un video puesto uno
// tras otro eso se nota como un salto.
//
// Usan las mismas fuentes que la landing (Outfit para títulos, Inter para
// texto) y la misma silueta de lomas que HeroBanner.tsx, así que las láminas
// y la página se ven de la misma familia.
//
// Uso:
//   node scripts/landing-panels.mjs --out /ruta/de/salida

import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

// Salida por defecto fuera de frontend/public: las láminas son un insumo
// intermedio que acaba dentro del video, no un archivo que deba publicarse.
const OUT = path.resolve(args.out || 'build/landing-paneles');
const FUENTES = path.resolve('frontend/public/fonts');

// Los tres pasos son los mismos que ya están en la landing (content.ts):
// el video refuerza la página en vez de contar otra historia.
const PANELES = [
  {
    archivo: 'portada.png',
    portada: true,
    titulo: 'Cómo <em>empezamos</em>',
    texto: 'Tres pasos para que tu rancho mida en vez de recordar',
  },
  {
    archivo: 'paso-1.png',
    numero: '1',
    titulo: 'Ajustamos el sistema',
    texto: 'A tu forma de trabajar: engorda, pie de cría o ambos.',
  },
  {
    archivo: 'paso-2.png',
    numero: '2',
    titulo: 'Pasamos tu información',
    texto: 'Tu libreta o tu Excel entran al sistema. No empiezas de cero.',
  },
  {
    archivo: 'paso-3.png',
    numero: '3',
    titulo: 'Capacitamos a tu equipo',
    texto: 'En menos de una hora tu gente registra desde el corral.',
  },
];

// Mismo trazo de lomas que HeroBanner.tsx, reescalado de 1440x700 a 1280x800.
const LOMAS = `
  <path d="M0 520 C 240 440, 420 470, 640 500 S 1060 560, 1440 470 L1440 700 L0 700 Z"
        fill="#0b3f3d" opacity="0.55" />
  <path d="M0 600 C 300 540, 560 580, 820 560 S 1200 520, 1440 580 L1440 700 L0 700 Z"
        fill="#07302f" opacity="0.8" />
`;

async function fuenteBase64(nombre) {
  const buf = await readFile(path.join(FUENTES, nombre));
  return buf.toString('base64');
}

function html(panel, outfit900, outfit700, inter400) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: 'Outfit'; font-weight: 900; src: url(data:font/woff2;base64,${outfit900}) format('woff2'); }
    @font-face { font-family: 'Outfit'; font-weight: 700; src: url(data:font/woff2;base64,${outfit700}) format('woff2'); }
    @font-face { font-family: 'Inter';  font-weight: 400; src: url(data:font/woff2;base64,${inter400}) format('woff2'); }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 1280px; height: 800px; overflow: hidden; }
    .lamina {
      position: relative; width: 1280px; height: 800px;
      background:
        radial-gradient(120% 90% at 78% 12%, rgba(6,182,212,0.16) 0%, rgba(6,182,212,0) 55%),
        linear-gradient(160deg, #06202e 0%, #041824 45%, #000a10 100%);
      overflow: hidden;
    }
    svg.lomas { position: absolute; left: 0; bottom: 0; width: 100%; height: 46%; }
    .marca {
      position: absolute; top: 46px; right: 56px;
      font-family: 'Outfit'; font-weight: 700; font-size: 22px;
      color: #ffffff; letter-spacing: -0.01em;
    }
    .centro {
      position: absolute; left: 96px; top: 50%; transform: translateY(-50%);
      max-width: 940px;
    }
    .numero {
      font-family: 'Outfit'; font-weight: 900; font-size: 22px;
      color: #34d399; letter-spacing: 0.22em; text-transform: uppercase;
      margin-bottom: 18px;
    }
    .titulo {
      font-family: 'Outfit'; font-weight: 900; font-size: 80px; line-height: 1.06;
      color: #ffffff; letter-spacing: -0.015em; word-spacing: 0.06em;
    }
    .titulo em { font-style: normal; color: #34d399; }
    .texto {
      font-family: 'Inter'; font-weight: 400; font-size: 27px; line-height: 1.45;
      color: #cbd9e2; margin-top: 26px; max-width: 900px;
    }
    .raya {
      width: 84px; height: 5px; border-radius: 3px; margin-top: 34px;
      background: linear-gradient(90deg, #34d399 0%, #06b6d4 100%);
    }
    /* Portada: mismo lenguaje que los pasos, pero centrada y sin numeral. */
    .portada { left: 0; right: 0; max-width: none; text-align: center; padding: 0 90px; }
    .portada .titulo { font-size: 92px; }
    .portada .texto { margin: 30px auto 0; max-width: 820px; }
    .portada .raya { margin: 38px auto 0; }
  </style></head><body>
    <div class="lamina">
      <svg class="lomas" viewBox="0 0 1440 700" preserveAspectRatio="none">${LOMAS}</svg>
      <div class="marca">SheepMaster</div>
      <div class="centro${panel.portada ? ' portada' : ''}">
        ${panel.portada ? '' : `<div class="numero">Paso ${panel.numero} de 3</div>`}
        <div class="titulo">${panel.titulo}</div>
        <div class="texto">${panel.texto}</div>
        <div class="raya"></div>
      </div>
    </div>
  </body></html>`;
}

const [outfit900, outfit700, inter400] = await Promise.all([
  fuenteBase64('outfit-900.woff2'),
  fuenteBase64('outfit-700.woff2'),
  fuenteBase64('inter-400.woff2'),
]);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  for (const panel of PANELES) {
    await page.setContent(html(panel, outfit900, outfit700, inter400), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, panel.archivo) });
    console.log('  ✓', panel.archivo);
  }
} finally {
  await browser.close();
}
