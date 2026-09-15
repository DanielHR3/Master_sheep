// Regenera las imágenes y videos de la landing a partir del hato demo.
//
// Existe porque las piezas originales se capturaron con la sesión de un
// cliente real y llevaban su logo y su nombre a la vista. Con esto, rehacerlas
// es un comando en vez de una tarde de recortes.
//
// Requisitos:
//   1. Un servidor con la base demo sembrada (ver seeder/demo).
//   2. npx playwright install chromium (una vez).
//
// Uso:
//   node scripts/capture-landing.mjs --base http://localhost:8099 \
//        --out frontend/public/landing
//
// Cada pieza se escribe con el mismo nombre y las mismas dimensiones que la
// que reemplaza, para que la landing no necesite ningún cambio de código.

import { chromium } from 'playwright';
import { mkdir, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const BASE = args.base || 'http://localhost:8099';
const OUT = path.resolve(args.out || 'frontend/public/landing');
const EMAIL = args.email || 'demo@sheepmaster.com';
const PASSWORD = args.password || 'demo-landing-2026';
const only = args.only ? new Set(args.only.split(',')) : null;

const wants = (name) => !only || only.has(name);
const log = (...m) => console.log('  ', ...m);

// Desktop a 2x: 1440x900 lógicos dan los 2880x1800 de los originales.
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
// iPhone 12 Pro: 390x844 a 3x dan los 1170x2532 del original.
const MOVIL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
// Los videos de la landing son 1280x800 a 1x.
const VIDEO = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };

async function login(page) {
  // "/" muestra la landing a un navegador nuevo; el login vive en "/login".
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button:has-text("Entrar al Sistema")');
  // El dashboard queda listo cuando aparece el encabezado de la app.
  await page.waitForSelector('text=Resumen de Operación', { timeout: 20000 });
  await page.waitForTimeout(1500); // que terminen las animaciones de entrada
}

// asegurarMarcaNeutra falla ruidosamente si alguna pieza va a salir con el
// nombre de un rancho cliente. Es la red de seguridad de todo este script:
// más vale abortar que volver a publicar una captura que delate a alguien.
async function asegurarMarcaNeutra(page, pieza) {
  const texto = await page.evaluate(() => document.body.innerText);
  const prohibidos = ['PABLITO', 'Pablito', 'BUGAMBILIAS', 'Bugambilias', 'Bugamb.'];
  const hallados = prohibidos.filter((p) => texto.includes(p));
  if (hallados.length) {
    throw new Error(
      `"${pieza}" iba a salir con nombre de cliente a la vista: ${hallados.join(', ')}. ` +
        `Captura abortada.`,
    );
  }
}

async function capturar(page, nombre, opciones = {}) {
  if (!wants(nombre)) return;
  await asegurarMarcaNeutra(page, nombre);
  const destino = path.join(OUT, nombre);
  await page.screenshot({ path: destino, ...opciones });
  log(`✓ ${nombre}`);
}

async function irA(page, etiqueta) {
  await page.click(`nav >> text=${etiqueta}`);
  await page.waitForTimeout(1200);
}

// ---------------------------------------------------------------- imágenes

async function capturasEscritorio(browser) {
  const ctx = await browser.newContext(DESKTOP);
  const page = await ctx.newPage();
  await login(page);

  // engorda.png — el dashboard completo, que es la cara del producto.
  await capturar(page, 'engorda.png');

  // cria.png — inventario filtrado a pie de cría.
  await irA(page, 'Inventario Hato');
  const filtro = page.locator('button:has-text("Pie de Cría")').first();
  if (await filtro.count()) {
    await filtro.click();
    await page.waitForTimeout(1000);
  }
  await capturar(page, 'cria.png');

  // genealogia.png — el árbol de SM-100 sobre el inventario desenfocado.
  if (wants('genealogia.png')) {
    await irA(page, 'Inventario Hato');
    const todos = page.locator('button:has-text("Todos")').first();
    if (await todos.count()) {
      await todos.click();
      await page.waitForTimeout(800);
    }
    // Buscar "SM-1" deja en pantalla toda la engorda (SM-100..SM-144) con
    // SM-100 de primero: fondo lleno para la captura y una sola tarjeta que
    // identificar. Sin el filtro no hay forma estable de apuntar a su botón.
    const buscador = page.locator('input[type="search"]').first();
    await buscador.click();
    await buscador.fill('SM-1');
    await page.waitForTimeout(900);
    await page.locator('button:has-text("Genética")').first().click();
    await page.waitForSelector('text=Genética: SM-100', { timeout: 10000 });
    await page.waitForTimeout(1200);
    await capturar(page, 'genealogia.png');
    // Cerrar de verdad: mientras el velo del modal siga puesto intercepta los
    // clics y la siguiente captura falla.
    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForSelector('.fixed.inset-0.z-\\[100\\]', { state: 'detached', timeout: 10000 });
    await page.waitForTimeout(600);
    await page.locator('input[type="search"]').first().fill('');
    await page.waitForTimeout(600);
  }

  // agenda.png — solo la tarjeta de Agenda Sanitaria, recortada.
  if (wants('agenda.png')) {
    await irA(page, 'Dashboard');
    // La tarjeta es el div redondeado que envuelve al encabezado; .last()
    // sobre todos los div devuelve el envoltorio del título y solo recorta
    // el texto, así que se sube desde el h3 al contenedor con rounded-[40px].
    const tarjeta = page.locator(
      'xpath=//h3[normalize-space()="Agenda Sanitaria"]/ancestor::div[contains(@class,"rounded-[40px]")][1]',
    );
    await asegurarMarcaNeutra(page, 'agenda.png');
    await tarjeta.screenshot({ path: path.join(OUT, 'agenda.png') });
    log('✓ agenda.png');
  }

  await ctx.close();
}

async function capturaMovil(browser) {
  if (!wants('movil-inventario.png')) return;
  const ctx = await browser.newContext(MOVIL);
  const page = await ctx.newPage();
  await login(page);
  // La barra inferior del móvil son botones con icono y sin texto, así que se
  // apunta por posición: el segundo es Inventario.
  await page.locator('div.fixed.bottom-0.md\\:hidden button').nth(1).click();
  await page.waitForTimeout(1800);
  await capturar(page, 'movil-inventario.png');
  await ctx.close();
}

async function capturaOG(browser) {
  if (!wants('og.png')) return;
  // og.png es la propia landing pública, no la app: es lo que se ve al
  // compartir el enlace en WhatsApp o LinkedIn.
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/inicio`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await asegurarMarcaNeutra(page, 'og.png');
  await page.screenshot({ path: path.join(OUT, 'og.png') });
  log('✓ og.png');
  await ctx.close();
}

// ------------------------------------------------------------------ videos

// grabar corre `guion` con el video de Playwright encendido y deja el .webm
// resultante en un temporal; la conversión a mp4 la hace ffmpeg fuera.
async function grabar(browser, nombre, guion) {
  const tmp = path.join(OUT, '.video-tmp');
  await mkdir(tmp, { recursive: true });
  const ctx = await browser.newContext({ ...VIDEO, recordVideo: { dir: tmp, size: VIDEO.viewport } });
  const page = await ctx.newPage();
  try {
    await guion(page, ctx);
  } finally {
    const video = page.video();
    await ctx.close(); // el video solo se escribe al cerrar el contexto
    if (video) {
      const origen = await video.path();
      const destino = path.join(OUT, `${nombre}.webm`);
      if (existsSync(destino)) await rm(destino);
      await rename(origen, destino);
      log(`✓ ${nombre}.webm (convertir a mp4 con ffmpeg)`);
    }
  }
  await rm(tmp, { recursive: true, force: true });
}

// videoHero: captura de un pesaje desde el inventario del hato.
//
// Ojo con el alcance: la cola de sincronización sin señal (sync_outbox) solo
// existe en el build de ESCRITORIO con DATABASE_URL. El build web guarda
// directo a la nube, así que aquí no hay forma de mostrar el aviso de
// "pendiente de sincronizar": cortar la red solo deja el guardado en error y
// el modal congelado. Por eso el clip termina al capturar el peso, y el pie
// de foto de la landing describe justo eso y no promete la sincronización.
async function videoHero(browser) {
  if (!wants('hero')) return;
  await grabar(browser, 'hero', async (page) => {
    await login(page);
    await page.click('nav >> text=Inventario Hato');
    await page.waitForTimeout(1800);

    const tarjeta = page.locator('text=MAD-01').first();
    await tarjeta.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page
      .locator('div', { has: page.locator('text=MAD-01') })
      .locator('button:has-text("PESO")')
      .first()
      .click();
    await page.waitForTimeout(1200);

    const campo = page.locator('input[type="number"]').first();
    await campo.click();
    await campo.fill('');
    await campo.type('47.5', { delay: 200 });
    // Un respiro para que se lea el número y ahí termina: sin cola de
    // pendientes, todo lo que siga sería un modal inmóvil.
    await page.waitForTimeout(1500);
  });
}

// videoSemaforo: recorrido por el dashboard mostrando los colores del hato.
async function videoSemaforo(browser) {
  if (!wants('semaforo')) return;
  await grabar(browser, 'semaforo', async (page) => {
    await login(page);
    await page.waitForTimeout(1500);
    for (const y of [0, 260, 520, 780, 980]) {
      await page.evaluate((to) => window.scrollTo({ top: to, behavior: 'smooth' }), y);
      await page.waitForTimeout(1600);
    }
  });
}

// -------------------------------------------------------------------- main

const browser = await chromium.launch();
try {
  await mkdir(OUT, { recursive: true });
  console.log(`Capturando desde ${BASE} hacia ${OUT}`);
  await capturasEscritorio(browser);
  await capturaMovil(browser);
  await capturaOG(browser);
  await videoHero(browser);
  await videoSemaforo(browser);
  console.log('Listo.');
} finally {
  await browser.close();
}
