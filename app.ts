import { Application } from 'pixi.js';
import { LifeData } from './data.ts';
import { GridLayout } from './grid.ts';
import { ViewportManager } from './viewport.ts';
import {
  GridMotionConfig,
  ViewportConfig,
  GridPalette,
  defaultGridMotion,
  defaultViewportConfig,
  defaultGridPalette,
} from './config.ts';

const app = new Application();
let gridLayout: GridLayout;
const BIRTHDATE_KEY = 'life-calendar.birthdate';
const LIFE_EXPECTANCY_KEY = 'life-calendar.lifeExpectancy';

function registerErrorLogging() {
  globalThis.addEventListener('error', (event) => {
    const { message, filename, lineno, colno, error } = event;
    console.error('[LifeCalendar] Uncaught error', {
      message,
      filename,
      lineno,
      colno,
      stack: error?.stack,
    });
  });

  globalThis.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    console.error('[LifeCalendar] Unhandled promise rejection', {
      reason,
      stack: reason?.stack,
    });
  });
}

function loadStoredBirthdate(): string | null {
  try {
    return localStorage.getItem(BIRTHDATE_KEY);
  } catch {
    return null;
  }
}

function persistBirthdate(value: string) {
  try {
    localStorage.setItem(BIRTHDATE_KEY, value);
  } catch {
    // ignore storage errors
  }
}

function loadStoredLifeExpectancy(): number | null {
  try {
    const raw = localStorage.getItem(LIFE_EXPECTANCY_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistLifeExpectancy(value: number) {
  try {
    localStorage.setItem(LIFE_EXPECTANCY_KEY, value.toString());
  } catch {
    // ignore storage errors
  }
}

function getBirthdate(): string {
  const input = document.getElementById('birthdate') as HTMLInputElement | null;
  return input?.value || '2000-01-01';
}

function getLifeExpectancy(): number {
  const input = document.getElementById('life-expectancy') as HTMLInputElement | null;
  const parsed = Number.parseInt(input?.value || '', 10);
  const clamped = Math.min(Math.max(parsed || 90, 1), 120);

  if (input && input.value !== clamped.toString()) {
    input.value = clamped.toString();
  }

  return clamped;
}

function buildLifeData(): LifeData {
  const lifeData = new LifeData(getBirthdate(), getLifeExpectancy());
  lifeData.addEvent(new Date(), 'Today', 'milestone');
  lifeData.generateWeeks();
  return lifeData;
}

function renderLife() {
  const lifeData = buildLifeData();
  gridLayout.render(lifeData);
}

function loadConfig<T>(defaults: T, overrides?: Partial<T>): T {
  return { ...defaults, ...(overrides || {}) };
}

async function init() {
  try {
    await app.init({
      resizeTo: window,
      backgroundColor: 0x111111,
      antialias: true,
      autoDensity: true,
      resolution: globalThis.devicePixelRatio || 1,
    });
  } catch (error) {
    console.error('PixiJS init failed', error);
    return;
  }

  registerErrorLogging();

  document.getElementById('app')?.appendChild(app.canvas);
  (window as typeof window & { app?: Application }).app = app;

  const birthInput = document.getElementById('birthdate') as HTMLInputElement | null;
  const expectancyInput = document.getElementById('life-expectancy') as HTMLInputElement | null;

  const storedBirth = loadStoredBirthdate();
  if (birthInput && storedBirth) {
    birthInput.value = storedBirth;
  }

  const storedExpectancy = loadStoredLifeExpectancy();
  if (expectancyInput && storedExpectancy) {
    expectancyInput.value = storedExpectancy.toString();
  }

  const runtimeOverrides = (globalThis as typeof globalThis & {
    lifeConfig?: {
      gridMotion?: Partial<GridMotionConfig>;
      viewport?: Partial<ViewportConfig>;
      gridPalette?: Partial<GridPalette>;
    };
  }).lifeConfig;
  const gridMotion = loadConfig(defaultGridMotion, runtimeOverrides?.gridMotion);
  const gridPalette = loadConfig(defaultGridPalette, runtimeOverrides?.gridPalette);
  const viewportCfg = loadConfig(defaultViewportConfig, runtimeOverrides?.viewport);

  gridLayout = new GridLayout(app, gridMotion, gridPalette);
  renderLife();

  birthInput?.addEventListener('change', () => {
    persistBirthdate(getBirthdate());
    renderLife();
  });
  expectancyInput?.addEventListener('change', () => {
    const value = getLifeExpectancy();
    persistLifeExpectancy(value);
    renderLife();
  });

  new ViewportManager(app, gridLayout.container, viewportCfg);
}

init();
