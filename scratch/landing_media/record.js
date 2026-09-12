// Graba videos y capturas reales de la app para la landing.
// Uso: node scratch/landing_media/record.js <base-url> <email> <password> <outdir>
//   OFFLINE=1 añade el video del hero (requiere el build de escritorio con
//   DATABASE_URL a un Postgres en Docker llamado lp-pg; ver el plan, Tarea 7).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const [base, email, password, outDir] = process.argv.slice(2);
if (!outDir) { console.error('uso: record.js <base-url> <email> <password> <outdir>'); process.exit(2); }
fs.mkdirSync(path.join(outDir, 'raw'), { recursive: true });

async function login(page) {
  await page.goto(base + '/login');
  await page.getByRole('textbox', { name: 'Correo Corporativo' }).fill(email);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(password);
  await page.getByRole('button', { name: 'Entrar al Sistema' }).click();
  await page.getByText('SYNC CLOUD').first().waitFor();
  await page.waitForTimeout(1500);
}

async function withContext(browser, opts, fn) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  try { await fn(page); } finally { await context.close(); }
}

const nav = (page, name) => page.getByRole('button', { name }).first().click();

(async () => {
  const browser = await chromium.launch();
  const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
  const video = { recordVideo: { dir: path.join(outDir, 'raw'), size: { width: 1440, height: 900 } } };

  // --- Capturas de escritorio ---
  await withContext(browser, desktop, async (page) => {
    await login(page);
    await page.screenshot({ path: path.join(outDir, 'engorda.png') });          // dashboard con semáforo
    // Agenda sanitaria: recorte de la tarjeta del dashboard (con respaldo a la pantalla clínica)
    const agenda = page.getByRole('heading', { name: 'Agenda Sanitaria' }).locator('xpath=ancestor::div[2]');
    try {
      await agenda.screenshot({ path: path.join(outDir, 'agenda.png') });
    } catch {
      await nav(page, 'Control Clínico');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, 'agenda.png') });
      await nav(page, 'Dashboard');
    }
    await nav(page, 'Inventario Hato');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Pie de Cría' }).first().click();    // filtro del inventario
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'cria.png') });
    await page.getByRole('button', { name: 'Engorda' }).first().click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Genética' }).first().click();       // árbol de un cordero (padres y abuelos)
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'genealogia.png') });
  });

  // --- Captura móvil ---
  await withContext(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, async (page) => {
    await login(page);
    // La barra móvil es fija abajo y sus botones solo tienen icono: el 2º es Inventario.
    await page.locator('.fixed.bottom-0 button').nth(1).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'movil-inventario.png') });
  });

  // --- Video: semáforo de venta (scroll suave por el dashboard) ---
  await withContext(browser, { ...desktop, ...video }, async (page) => {
    await login(page);
    await page.waitForTimeout(1500);
    await page.waitForTimeout(1500);
    for (let y = 0; y <= 900; y += 20) { await page.mouse.wheel(0, 20); await page.waitForTimeout(60); }
    await page.waitForTimeout(4000);
    const v = page.video();
    await page.close();
    fs.renameSync(await v.path(), path.join(outDir, 'raw', 'semaforo.webm'));
  });

  // --- Video: pesaje sin conexión → sincroniza ---
  if (process.env.OFFLINE === '1') {
    const { execSync } = require('child_process');
    await withContext(browser, { ...desktop, ...video }, async (page) => {
      await login(page);
      execSync('docker stop lp-pg');                                   // "sin señal"
      await nav(page, 'Inventario Hato');
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: 'Peso' }).first().click();
      await page.waitForTimeout(800);
      await page.getByRole('spinbutton').first().fill('43.5');
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: 'GUARDAR PESAJE' }).click();
      await page.waitForTimeout(1800);
      await nav(page, 'Dashboard');
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: 'SYNC CLOUD' }).click();  // → pendiente (sin conexión)
      await page.waitForTimeout(3000);
      execSync('docker start lp-pg');
      await page.waitForTimeout(3500);
      await page.getByRole('button', { name: 'SYNC CLOUD' }).click();  // → Todo sincronizado
      await page.waitForTimeout(3500);
      const v = page.video();
      await page.close();
      fs.renameSync(await v.path(), path.join(outDir, 'raw', 'hero.webm'));
    });
  }

  await browser.close();
  console.log('media grabada en', outDir);
})().catch((e) => { console.error(e); process.exit(1); });
