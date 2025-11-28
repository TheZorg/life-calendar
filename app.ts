import { Application, NoiseFilter, Point } from "pixi.js";
import { AdvancedBloomFilter, RGBSplitFilter } from "pixi-filters";
import { LifeData } from "./data.ts";
import { GridLayout } from "./grid.ts";
import { ViewportManager } from "./viewport.ts";
import {
  defaultGridMotion,
  defaultGridPalette,
  defaultPostProcessing,
  defaultViewportConfig,
  GridMotionConfig,
  GridPalette,
  PostProcessingConfig,
  ViewportConfig,
} from "./config.ts";

const app = new Application();
let gridLayout: GridLayout;
const BIRTHDATE_KEY = "life-calendar.birthdate";
const LIFE_EXPECTANCY_KEY = "life-calendar.lifeExpectancy";
const SPANS_KEY = "life-calendar.spans";
const SPAN_COLORS = [
  0x7bdff2,
  0xf9c74f,
  0xff9f1c,
  0xe07a5f,
  0xc08497,
  0x84a59d,
  0x90be6d,
];
type StoredSpan = {
  id: string;
  title: string;
  start: string;
  end?: string | null;
  color: number;
  openEnded?: boolean;
};
let spans: StoredSpan[] = [];
let editingSpanId: string | null = null;

function registerErrorLogging() {
  globalThis.addEventListener("error", (event) => {
    const { message, filename, lineno, colno, error } = event;
    console.error("[LifeCalendar] Uncaught error", {
      message,
      filename,
      lineno,
      colno,
      stack: error?.stack,
    });
  });

  globalThis.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    console.error("[LifeCalendar] Unhandled promise rejection", {
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

function loadStoredSpans(): StoredSpan[] {
  try {
    const raw = localStorage.getItem(SPANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredSpan[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((span) => ({
        id: span.id,
        title: span.title,
        start: span.start,
        end: span.end ?? null,
        color: typeof span.color === "number"
          ? span.color
          : parseInt(String(span.color ?? "0"), 10) || SPAN_COLORS[0],
        openEnded: span.openEnded ?? span.end === null,
      }))
      .filter((span) =>
        span.title && span.start && (span.end || span.openEnded)
      );
  } catch {
    return [];
  }
}

function persistSpans(value: StoredSpan[]) {
  try {
    localStorage.setItem(SPANS_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function getBirthdate(): string {
  const input = document.getElementById("birthdate") as HTMLInputElement | null;
  return input?.value || "2000-01-01";
}

function getLifeExpectancy(): number {
  const input = document.getElementById("life-expectancy") as
    | HTMLInputElement
    | null;
  const parsed = Number.parseInt(input?.value || "", 10);
  const clamped = Math.min(Math.max(parsed || 90, 1), 120);

  if (input && input.value !== clamped.toString()) {
    input.value = clamped.toString();
  }

  return clamped;
}

function buildLifeData(): LifeData {
  const lifeData = new LifeData(getBirthdate(), getLifeExpectancy());
  lifeData.addEvent(new Date(), "Today", "milestone");
  spans.forEach((span) => {
    lifeData.spans.push({
      id: span.id,
      title: span.title,
      startDate: new Date(span.start),
      endDate: span.end ? new Date(span.end) : null,
      color: span.color,
    });
  });
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

function loadPostProcessingConfig(
  overrides?: Partial<PostProcessingConfig>,
): PostProcessingConfig {
  return {
    ...defaultPostProcessing,
    ...(overrides || {}),
    bloom: { ...defaultPostProcessing.bloom, ...(overrides?.bloom || {}) },
    aberration: {
      ...defaultPostProcessing.aberration,
      ...(overrides?.aberration || {}),
    },
    grain: { ...defaultPostProcessing.grain, ...(overrides?.grain || {}) },
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function numberToHex(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function parseColorInput(value: string, fallback: number) {
  if (!value) return fallback;
  const clean = value.startsWith("#") ? value.slice(1) : value;
  const parsed = Number.parseInt(clean, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDefaultSpanStartValue() {
  const birthInput = document.getElementById("birthdate") as
    | HTMLInputElement
    | null;
  return birthInput?.value || "";
}

function getDefaultSpanEndValue() {
  return new Date().toISOString().slice(0, 10);
}

function updateSpanFormState(span: StoredSpan | null) {
  const titleInput = document.getElementById("span-title") as
    | HTMLInputElement
    | null;
  const startInput = document.getElementById("span-start") as
    | HTMLInputElement
    | null;
  const endInput = document.getElementById("span-end") as
    | HTMLInputElement
    | null;
  const ongoingInput = document.getElementById("span-ongoing") as
    | HTMLInputElement
    | null;
  const colorInput = document.getElementById("span-color") as
    | HTMLInputElement
    | null;
  const submitBtn = document.getElementById("submit-span") as
    | HTMLButtonElement
    | null;
  const cancelBtn = document.getElementById("cancel-edit") as
    | HTMLButtonElement
    | null;

  const setOngoing = (checked: boolean) => {
    if (ongoingInput) ongoingInput.checked = checked;
    if (endInput) {
      endInput.disabled = checked;
      if (checked) endInput.value = "";
    }
  };

  if (span) {
    editingSpanId = span.id;
    if (titleInput) titleInput.value = span.title;
    if (startInput) startInput.value = span.start;
    if (endInput) endInput.value = span.end || "";
    if (colorInput) colorInput.value = numberToHex(span.color);
    setOngoing(Boolean(span.openEnded));
    if (submitBtn) submitBtn.textContent = "Update span";
    if (cancelBtn) cancelBtn.style.visibility = "visible";
  } else {
    editingSpanId = null;
    if (titleInput) titleInput.value = "";
    if (startInput) startInput.value = getDefaultSpanStartValue();
    if (endInput) endInput.value = getDefaultSpanEndValue();
    if (colorInput) {
      colorInput.value = numberToHex(
        SPAN_COLORS[spans.length % SPAN_COLORS.length],
      );
    }
    setOngoing(false);
    if (submitBtn) submitBtn.textContent = "Add span";
    if (cancelBtn) cancelBtn.style.visibility = "hidden";
  }
}

function beginEditSpan(span: StoredSpan) {
  updateSpanFormState(span);
}

function renderSpanList() {
  const list = document.getElementById("span-list");
  if (!list) return;
  list.innerHTML = "";

  spans.forEach((span) => {
    const row = document.createElement("div");
    row.className = "span-row";
    if (span.id === editingSpanId) {
      row.style.outline = "1px solid rgba(255, 255, 255, 0.14)";
    }

    const swatch = document.createElement("div");
    swatch.className = "span-swatch";
    swatch.style.backgroundColor = numberToHex(span.color);
    row.appendChild(swatch);

    const meta = document.createElement("div");
    meta.className = "span-meta";
    const title = document.createElement("div");
    title.className = "span-title";
    title.textContent = span.title;
    const dates = document.createElement("div");
    dates.className = "span-dates-text";
    dates.textContent = `${formatDate(span.start)} – ${
      span.end ? formatDate(span.end) : "Present"
    }`;
    meta.appendChild(title);
    meta.appendChild(dates);
    row.appendChild(meta);

    const edit = document.createElement("button");
    edit.className = "span-edit";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => beginEditSpan(span));
    row.appendChild(edit);

    const remove = document.createElement("button");
    remove.className = "span-remove";
    remove.textContent = "✕";
    remove.addEventListener("click", () => {
      spans = spans.filter((s) => s.id !== span.id);
      persistSpans(spans);
      if (editingSpanId === span.id) {
        updateSpanFormState(null);
      }
      renderSpanList();
      renderLife();
    });
    row.appendChild(remove);

    list.appendChild(row);
  });
}

function handleAddSpan() {
  const titleInput = document.getElementById("span-title") as
    | HTMLInputElement
    | null;
  const startInput = document.getElementById("span-start") as
    | HTMLInputElement
    | null;
  const endInput = document.getElementById("span-end") as
    | HTMLInputElement
    | null;
  const ongoingInput = document.getElementById("span-ongoing") as
    | HTMLInputElement
    | null;
  const colorInput = document.getElementById("span-color") as
    | HTMLInputElement
    | null;
  if (!titleInput || !startInput || !endInput) return;

  const title = titleInput.value.trim();
  const start = startInput.value;
  const end = endInput.value;
  const isOngoing = Boolean(ongoingInput?.checked);
  if (!title || !start || (!end && !isOngoing)) return;

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  if (
    Number.isNaN(startDate.getTime()) ||
    (end && Number.isNaN(endDate?.getTime() || 0))
  ) return;

  let normalizedStart = start;
  let normalizedEnd = end;
  if (!isOngoing && endDate && startDate > endDate) {
    normalizedStart = end;
    normalizedEnd = start;
    if (startInput && endInput) {
      startInput.value = normalizedStart;
      endInput.value = normalizedEnd;
    }
  }

  if (editingSpanId) {
    spans = spans.map((s) =>
      s.id === editingSpanId
        ? {
          ...s,
          title,
          start: normalizedStart,
          end: isOngoing ? null : normalizedEnd,
          openEnded: isOngoing,
          color: colorInput
            ? parseColorInput(colorInput.value, s.color)
            : s.color,
        }
        : s
    );
  } else {
    const defaultColor = SPAN_COLORS[spans.length % SPAN_COLORS.length];
    const color = colorInput
      ? parseColorInput(colorInput.value, defaultColor)
      : defaultColor;
    spans = [
      ...spans,
      {
        id: crypto.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        start: normalizedStart,
        end: isOngoing ? null : normalizedEnd,
        openEnded: isOngoing,
        color,
      },
    ];
  }
  persistSpans(spans);
  renderSpanList();
  renderLife();

  updateSpanFormState(null);
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
    console.error("PixiJS init failed", error);
    return;
  }

  registerErrorLogging();

  document.getElementById("app")?.appendChild(app.canvas);
  (window as typeof window & { app?: Application }).app = app;

  const birthInput = document.getElementById("birthdate") as
    | HTMLInputElement
    | null;
  const expectancyInput = document.getElementById("life-expectancy") as
    | HTMLInputElement
    | null;
  const spanStartInput = document.getElementById("span-start") as
    | HTMLInputElement
    | null;
  const spanEndInput = document.getElementById("span-end") as
    | HTMLInputElement
    | null;
  const spanOngoingInput = document.getElementById("span-ongoing") as
    | HTMLInputElement
    | null;
  const submitSpanBtn = document.getElementById("submit-span");
  const cancelEditBtn = document.getElementById("cancel-edit");
  spans = loadStoredSpans();

  const storedBirth = loadStoredBirthdate();
  if (birthInput && storedBirth) {
    birthInput.value = storedBirth;
  }

  const storedExpectancy = loadStoredLifeExpectancy();
  if (expectancyInput && storedExpectancy) {
    expectancyInput.value = storedExpectancy.toString();
  }
  if (spanStartInput && birthInput) {
    spanStartInput.value = birthInput.value;
  }
  if (spanEndInput) {
    spanEndInput.value = new Date().toISOString().slice(0, 10);
  }
  updateSpanFormState(null);

  const runtimeOverrides = (globalThis as typeof globalThis & {
    lifeConfig?: {
      gridMotion?: Partial<GridMotionConfig>;
      viewport?: Partial<ViewportConfig>;
      gridPalette?: Partial<GridPalette>;
      postProcessing?: Partial<PostProcessingConfig>;
    };
  }).lifeConfig;
  const gridMotion = loadConfig(
    defaultGridMotion,
    runtimeOverrides?.gridMotion,
  );
  const gridPalette = loadConfig(
    defaultGridPalette,
    runtimeOverrides?.gridPalette,
  );
  const viewportCfg = loadConfig(
    defaultViewportConfig,
    runtimeOverrides?.viewport,
  );
  const postFxCfg = loadPostProcessingConfig(runtimeOverrides?.postProcessing);

  gridLayout = new GridLayout(app, gridMotion, gridPalette);
  applyPostProcessing(app, postFxCfg);
  renderLife();
  renderSpanList();

  birthInput?.addEventListener("change", () => {
    persistBirthdate(getBirthdate());
    renderLife();
  });
  expectancyInput?.addEventListener("change", () => {
    const value = getLifeExpectancy();
    persistLifeExpectancy(value);
    renderLife();
  });

  submitSpanBtn?.addEventListener("click", handleAddSpan);
  cancelEditBtn?.addEventListener("click", () => updateSpanFormState(null));
  spanOngoingInput?.addEventListener("change", () => {
    const endField = document.getElementById("span-end") as
      | HTMLInputElement
      | null;
    if (!endField) return;
    endField.disabled = Boolean(spanOngoingInput.checked);
    if (spanOngoingInput.checked) {
      endField.value = "";
    } else if (!endField.value) {
      endField.value = getDefaultSpanEndValue();
    }
  });
  document.getElementById("span-title")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleAddSpan();
    }
  });

  new ViewportManager(app, gridLayout.container, viewportCfg);
}

function applyPostProcessing(app: Application, config: PostProcessingConfig) {
  if (!config.enabled) return;

  const filters = [];
  if (config.bloom.enabled) {
    const bloom = new AdvancedBloomFilter({
      threshold: config.bloom.threshold,
      bloomScale: config.bloom.bloomScale,
      brightness: config.bloom.brightness,
      blur: config.bloom.blur,
    });
    filters.push(bloom);
  }
  const rgbSplit = new RGBSplitFilter();
  const grain = new NoiseFilter({
    noise: config.grain.amount,
    seed: config.grain.seed,
  });
  filters.push(rgbSplit, grain);
  app.stage.filters = filters;

  let elapsed = 0;
  const aberrationBase = config.aberration.amount;
  const jitter = config.aberration.jitter;
  const updateAberration = (offset: number) => {
    const redX = -offset;
    const redY = -offset * 0.55;
    const blueX = offset;
    const blueY = offset * 0.55;
    rgbSplit.red instanceof Point
      ? rgbSplit.red.set(redX, redY)
      : (rgbSplit.red = new Point(redX, redY));
    rgbSplit.green instanceof Point
      ? rgbSplit.green.set(0, 0)
      : (rgbSplit.green = new Point(0, 0));
    rgbSplit.blue instanceof Point
      ? rgbSplit.blue.set(blueX, blueY)
      : (rgbSplit.blue = new Point(blueX, blueY));
  };
  updateAberration(aberrationBase);

  app.ticker.add((ticker) => {
    const deltaMs = ticker.deltaMS ?? 0;
    elapsed += deltaMs;

    if (config.aberration.animated) {
      const wobble = Math.sin(elapsed * 0.0018) * jitter;
      updateAberration(aberrationBase + wobble);
    }

    if (config.grain.animated) {
      const deltaSeed = (deltaMs * 0.0002) % 1;
      grain.seed = (grain.seed + deltaSeed) % 1;
    }
  });
}

init();
