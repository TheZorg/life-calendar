import { Application, Container, Graphics, Text } from "pixi.js";
import { LifeData } from "./data.ts";
import {
  defaultGridMotion,
  defaultGridPalette,
  GridLabelStyle,
  GridMotionConfig,
  GridPalette,
} from "./config.ts";

interface WeekCell {
  graphic: Graphics;
  ring: Graphics;
  baseX: number;
  baseY: number;
  jitterSeed: number;
  baseColor: number;
  yearIndex: number;
  startDate: Date;
  hoverHeat: number;
  yearHeat: number;
  focusHeat: number;
}

interface LabelState {
  container: Container;
  bg: Graphics;
  text: Text;
  heat: number;
  pos: { x: number; y: number };
  target: { x: number; y: number };
  currentKey: string | null;
}

export class GridLayout {
  app: Application;
  container: Container;
  fxContainer: Container;
  labelLayer: Container;
  weekSize = 11;
  gap = 10;
  yearGap = 8;
  cells: WeekCell[] = [];
  elapsedMs = 0;
  pointer = { x: 0, y: 0, viewX: 0, viewY: 0, active: false };
  motion: GridMotionConfig;
  palette: GridPalette;
  yearLabel: LabelState;
  weekLabel: LabelState;
  spanGutter = 170;
  spanLaneSpacing = 26;
  spanMinWidth = 120;
  textResolution: number;

  constructor(
    app: Application,
    motionOverrides: Partial<GridMotionConfig> = {},
    paletteOverrides: Partial<GridPalette> = {},
  ) {
    this.app = app;
    this.container = new Container();
    this.fxContainer = new Container();
    this.labelLayer = new Container();
    this.container.addChild(this.fxContainer);
    this.container.addChild(this.labelLayer);
    this.motion = this.mergeMotion(defaultGridMotion, motionOverrides);
    this.palette = { ...defaultGridPalette, ...paletteOverrides };
    this.textResolution = Math.min((globalThis.devicePixelRatio || 1) * 2, 4);
    this.app.stage.addChild(this.container);
    this.app.ticker.add((ticker) => this.animate(ticker.deltaMS));
    this.registerPointerTracking();
    this.yearLabel = this.createLabel(this.motion.year.label);
    this.weekLabel = this.createLabel(this.motion.week.label);
  }

  render(data: LifeData) {
    const hadChildren = this.cells.length > 0;
    const prevScale = this.container.scale.clone();
    const prevPosition = { x: this.container.x, y: this.container.y };

    this.fxContainer.removeChildren();
    this.labelLayer.removeChildren();
    this.cells = [];

    const cellLayer = new Container();
    const ringLayer = new Container();
    const spanLayer = new Container();
    spanLayer.sortableChildren = true;
    this.fxContainer.addChild(cellLayer);
    this.fxContainer.addChild(ringLayer);
    this.labelLayer.addChild(spanLayer);
    this.labelLayer.addChild(this.weekLabel.container);
    this.labelLayer.addChild(this.yearLabel.container);

    const cellByIndex = new Map<number, WeekCell>();

    data.weeks.forEach((week, i) => {
      const x = week.weekIndex * (this.weekSize + this.gap);
      const y = week.yearIndex * (this.weekSize + this.gap);

      let color = this.palette.future;
      if (week.events.length > 0) {
        color = this.palette.event;
      } else if (week.isPast) {
        color = this.palette.past;
      } else if (week.isCurrent) {
        color = this.palette.current;
      }

      const spanTint = this.mixSpanColors(week.spans);
      if (spanTint !== null) {
        color = this.mixColor(color, spanTint, 0.7);
      }

      const graphic = new Graphics();
      graphic.circle(0, 0, this.weekSize / 2);
      graphic.fill(0xffffff);
      graphic.tint = color;
      graphic.alpha = 0.85;

      const ring = new Graphics();
      ring.circle(0, 0, this.weekSize / 2 + 3);
      ring.stroke({ width: 2, color: 0xffffff });
      ring.alpha = 0;

      const cx = x + this.weekSize / 2;
      const cy = y + this.weekSize / 2;
      ring.position.set(cx, cy);
      graphic.position.set(cx, cy);
      cellLayer.addChild(graphic);
      ringLayer.addChild(ring);

      this.cells.push({
        graphic,
        ring,
        baseX: cx,
        baseY: cy,
        jitterSeed: 0.33 * i + Math.random() * 100,
        baseColor: color,
        yearIndex: week.yearIndex,
        startDate: week.startDate,
        hoverHeat: 0,
        yearHeat: 0,
        focusHeat: 0,
      });
      cellByIndex.set(week.index, this.cells[this.cells.length - 1]);
    });

    this.renderSpans(data, spanLayer, cellByIndex);

    const gridWidth = 52 * (this.weekSize + this.gap);
    const gridHeight = data.lifeExpectancyYears * (this.weekSize + this.gap);
    const totalWidth = gridWidth + this.spanGutter;

    if (hadChildren) {
      this.container.scale.set(prevScale.x, prevScale.y);
      this.container.position.set(prevPosition.x, prevPosition.y);
    } else {
      this.container.x = (this.app.screen.width - totalWidth) / 2 +
        this.spanGutter;
      this.container.y = (this.app.screen.height - gridHeight) / 2;
    }
  }

  private registerPointerTracking() {
    const updatePointer = (e: PointerEvent) => {
      const rect = this.app.canvas.getBoundingClientRect();
      const viewX = e.clientX - rect.left;
      const viewY = e.clientY - rect.top;
      this.setPointerFromView(viewX, viewY);
    };

    this.app.canvas.addEventListener("pointermove", updatePointer);
    this.app.canvas.addEventListener("pointerdown", updatePointer);
    this.app.canvas.addEventListener("pointerleave", () => {
      this.pointer.active = false;
    });
  }

  private setPointerFromView(viewX: number, viewY: number) {
    this.pointer.viewX = viewX;
    this.pointer.viewY = viewY;
    this.pointer.x = (viewX - this.container.x) / this.container.scale.x;
    this.pointer.y = (viewY - this.container.y) / this.container.scale.y;
    this.pointer.active = true;
  }

  private animate(deltaMs: number) {
    if (!this.cells.length) return;

    this.elapsedMs += deltaMs;
    const t = this.elapsedMs;
    const hoverRadiusSq = this.motion.hover.radius * this.motion.hover.radius;
    const heatDecay = Math.exp(-deltaMs * this.motion.hover.heatDecay);

    if (this.pointer.active) {
      this.setPointerFromView(this.pointer.viewX, this.pointer.viewY);
    }

    const hoveredCell = this.resolveHoveredCell();
    const hoveredYear = hoveredCell ? hoveredCell.yearIndex : null;
    this.updateYearLabel(hoveredYear, deltaMs);
    this.updateWeekLabel(hoveredCell, deltaMs);

    for (const cell of this.cells) {
      const noiseX =
        Math.sin(cell.jitterSeed + t * this.motion.idle.jitterSpeed) *
        this.motion.idle.jitter;
      const noiseY = Math.cos(
        cell.jitterSeed * 0.73 + t * (this.motion.idle.jitterSpeed * 0.9),
      ) * this.motion.idle.jitter;

      let influence = 0;

      if (this.pointer.active) {
        const dx = cell.baseX - this.pointer.x;
        const dy = cell.baseY - this.pointer.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < hoverRadiusSq) {
          const dist = Math.sqrt(distSq) || 1;
          influence = 1 - dist / this.motion.hover.radius;
        }
      }

      cell.hoverHeat = Math.max(influence, cell.hoverHeat * heatDecay);

      const yearTarget = hoveredYear !== null && cell.yearIndex === hoveredYear
        ? 1
        : 0;
      const focusTarget = hoveredCell === cell ? 1 : 0;
      cell.yearHeat = this.smooth(
        cell.yearHeat,
        yearTarget,
        this.motion.year.followRate,
        deltaMs,
      );
      cell.focusHeat = this.smooth(
        cell.focusHeat,
        focusTarget,
        this.motion.selection.followRate,
        deltaMs,
      );

      const breathing =
        Math.sin(cell.jitterSeed * 0.61 + t * this.motion.idle.breathingSpeed) *
        this.motion.idle.breathingAmount;
      const magnify =
        Math.pow(cell.hoverHeat, this.motion.hover.magnifyExponent) *
        this.motion.hover.magnifyStrength;
      const yearLift = cell.yearHeat * this.motion.year.highlightScale;
      const focusLift = cell.focusHeat * this.motion.selection.scaleBoost;
      const pulse = 1 +
        Math.sin(t * this.motion.selection.pulseSpeed + cell.jitterSeed) *
          this.motion.selection.pulseAmount *
          cell.focusHeat;
      const scale = (1 + breathing + magnify + yearLift + focusLift) * pulse;

      let tintMix = cell.baseColor;
      if (cell.yearHeat > 0) {
        tintMix = this.mixColor(
          tintMix,
          this.motion.year.highlightColor,
          cell.yearHeat * this.motion.year.highlightMix,
        );
      }
      if (cell.focusHeat > 0) {
        tintMix = this.mixColor(
          tintMix,
          this.motion.selection.color,
          cell.focusHeat,
        );
      }

      cell.graphic.tint = tintMix;
      cell.graphic.alpha = 0.78 + cell.hoverHeat * 0.15 + cell.yearHeat * 0.08 +
        cell.focusHeat * 0.12;

      cell.graphic.position.set(cell.baseX + noiseX, cell.baseY + noiseY);
      cell.graphic.scale.set(scale);

      const ringAlpha = cell.yearHeat * 0.22 +
        cell.focusHeat * this.motion.selection.outlineAlpha;
      cell.ring.alpha = ringAlpha;
      const ringTint = this.mixColor(
        this.motion.year.highlightColor,
        this.motion.selection.outlineColor,
        cell.focusHeat,
      );
      cell.ring.tint = ringTint;
      cell.ring.position.set(cell.baseX + noiseX, cell.baseY + noiseY);
      cell.ring.scale.set(
        scale * (1 + cell.yearHeat * 0.05 + cell.focusHeat * 0.12),
      );
    }
  }

  private resolveHoveredCell(): WeekCell | null {
    if (!this.pointer.active || !this.cells.length) return null;

    const thresholdSq = this.motion.hover.detectRadius *
      this.motion.hover.detectRadius;
    let closest: WeekCell | null = null;
    let bestDist = thresholdSq;

    for (const cell of this.cells) {
      const dx = cell.baseX - this.pointer.x;
      const dy = cell.baseY - this.pointer.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= bestDist) {
        bestDist = distSq;
        closest = cell;
      }
    }

    return closest;
  }

  private computeYearBounds(yearIndex: number) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let count = 0;

    for (const cell of this.cells) {
      if (cell.yearIndex !== yearIndex) continue;
      minX = Math.min(minX, cell.baseX);
      minY = Math.min(minY, cell.baseY);
      maxX = Math.max(maxX, cell.baseX);
      maxY = Math.max(maxY, cell.baseY);
      count++;
    }

    if (!count) return null;
    return { minX, minY, maxX, maxY };
  }

  private updateYearLabel(hoveredYear: number | null, deltaMs: number) {
    const label = this.yearLabel;
    const style = this.motion.year.label;
    const targetHeat = hoveredYear !== null ? 1 : 0;
    label.heat = this.smooth(label.heat, targetHeat, style.followRate, deltaMs);
    label.container.alpha = label.heat * 0.98;

    if (hoveredYear !== null) {
      const key = `year-${hoveredYear}`;
      if (label.currentKey !== key) {
        label.text.text = `Year ${hoveredYear + 1}`;
        label.currentKey = key;
      }

      const bounds = this.computeYearBounds(hoveredYear);
      if (bounds) {
        const pad = style.padding;
        const labelWidth = label.text.width + pad * 2;
        const labelHeight = label.text.height + pad * 0.9;
        const offset = this.weekSize * 0.6;

        label.target.x = bounds.minX - labelWidth - offset;
        label.target.y = (bounds.minY + bounds.maxY) / 2;

        label.pos.x = this.smooth(
          label.pos.x,
          label.target.x,
          style.followRate,
          deltaMs,
        );
        label.pos.y = this.smooth(
          label.pos.y,
          label.target.y,
          style.followRate,
          deltaMs,
        );
        label.container.position.set(label.pos.x, label.pos.y);

        label.bg.clear();
        label.bg.roundRect(
          -pad,
          -labelHeight / 2,
          labelWidth,
          labelHeight,
          style.radius,
        );
        label.bg.fill({ color: style.bg, alpha: 0.86 });
      }
    }
  }

  private updateWeekLabel(hoveredCell: WeekCell | null, deltaMs: number) {
    const label = this.weekLabel;
    const style = this.motion.week.label;
    const targetHeat = hoveredCell ? 1 : 0;
    label.heat = this.smooth(label.heat, targetHeat, style.followRate, deltaMs);
    label.container.alpha = label.heat * 0.98;

    if (hoveredCell) {
      const key = `week-${hoveredCell.startDate.toISOString()}`;
      if (label.currentKey !== key) {
        label.text.text = `Week of ${
          this.formatWeekLabel(hoveredCell.startDate)
        }`;
        label.currentKey = key;
      }

      const pad = style.padding;
      const labelWidth = label.text.width + pad * 2;
      const labelHeight = label.text.height + pad * 0.9;
      const offset = this.motion.week.offset;

      label.target.x = hoveredCell.baseX + offset;
      label.target.y = hoveredCell.baseY - this.weekSize * 0.2;

      label.pos.x = this.smooth(
        label.pos.x,
        label.target.x,
        style.followRate,
        deltaMs,
      );
      label.pos.y = this.smooth(
        label.pos.y,
        label.target.y,
        style.followRate,
        deltaMs,
      );
      label.container.position.set(label.pos.x, label.pos.y);

      label.bg.clear();
      label.bg.roundRect(
        -pad,
        -labelHeight / 2,
        labelWidth,
        labelHeight,
        style.radius,
      );
      label.bg.fill({ color: style.bg, alpha: 0.86 });
    }
  }

  private createLabel(style: GridLabelStyle): LabelState {
    const container = new Container();
    container.alpha = 0;
    const bg = new Graphics();
    container.addChild(bg);
    const text = new Text({
      text: "",
      resolution: this.textResolution,
      style: {
        fill: style.text,
        fontSize: 12,
        fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
        align: "left",
      },
    });
    text.anchor.set(0, 0.5);
    container.addChild(text);

    return {
      container,
      bg,
      text,
      heat: 0,
      pos: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      currentKey: null,
    };
  }

  private formatWeekLabel(startDate: Date) {
    return startDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  private renderSpans(
    data: LifeData,
    layer: Container,
    cellByIndex: Map<number, WeekCell>,
  ) {
    if (!data.spansWithBounds?.length) return;

    const spans = [...data.spansWithBounds].sort(
      (a, b) =>
        a.startWeekIndex - b.startWeekIndex || a.endWeekIndex - b.endWeekIndex,
    );
    const laneEnds: number[] = [];

    for (const span of spans) {
      const startCell = cellByIndex.get(span.startWeekIndex);
      const endCell = cellByIndex.get(span.endWeekIndex);
      if (!startCell || !endCell) continue;

      const startYear = startCell.yearIndex;
      let lane = laneEnds.findIndex((end) => {
        const endYear = Math.floor(end / 52);
        return span.startWeekIndex > end || startYear >= endYear;
      });
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = span.endWeekIndex;

      const yMid = (startCell.baseY + endCell.baseY) / 2;
      const baseX = -this.spanGutter + 16;
      const laneX = baseX - lane * this.spanLaneSpacing;
      const isOpenEnded = span.endDate === null;

      const text = new Text({
        text: span.title,
        style: {
          fill: 0x0b0d10,
          fontSize: 12,
          fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
        },
        resolution: this.textResolution,
      });
      text.anchor.set(0, 0.5);

      const padX = 10;
      const pillHeight = 22;
      const pillWidth = Math.max(this.spanMinWidth, text.width + padX * 2);

      const pillBg = new Graphics();
      pillBg.roundRect(
        0,
        -pillHeight / 2,
        pillWidth,
        pillHeight,
        pillHeight / 2.2,
      );
      pillBg.fill({ color: span.color, alpha: 0.88 });

      const minY = Math.min(startCell.baseY, endCell.baseY);
      const maxY = Math.max(startCell.baseY, endCell.baseY);

      const hookX = laneX + pillWidth + 12;
      const connector = new Graphics();
      connector.moveTo(laneX + pillWidth, yMid);
      connector.lineTo(hookX, yMid);
      connector.lineTo(hookX, minY);
      connector.lineTo(hookX, maxY);
      connector.stroke({ width: 2, color: span.color, alpha: 0.9 });
      connector.zIndex = 0;
      const dots = new Graphics();
      dots.circle(hookX, minY, 3);
      if (!isOpenEnded && maxY !== minY) {
        dots.circle(hookX, maxY, 3);
      }
      dots.fill({ color: span.color, alpha: 0.9 });
      dots.zIndex = 0.5;
      layer.addChild(connector);
      layer.addChild(dots);

      if (isOpenEnded) {
        const dashes = new Graphics();
        const dashLen = 7;
        const gap = 4;
        const dashCount = 3;
        for (let i = 0; i < dashCount; i++) {
          const y = maxY - i * (gap + 2);
          dashes.moveTo(hookX - dashLen / 2, y);
          dashes.lineTo(hookX + dashLen / 2, y);
        }
        dashes.stroke({ width: 2, color: span.color, alpha: 0.9 });
        dashes.zIndex = 0.6;
        layer.addChild(dashes);
      }

      const pill = new Container();
      pill.position.set(laneX, yMid);
      pill.addChild(pillBg);
      text.position.set(padX, 0);
      pill.addChild(text);
      pill.zIndex = 1;
      layer.addChild(pill);
    }
  }

  private mergeMotion(
    base: GridMotionConfig,
    overrides: Partial<GridMotionConfig>,
  ): GridMotionConfig {
    return {
      idle: { ...base.idle, ...(overrides.idle || {}) },
      hover: { ...base.hover, ...(overrides.hover || {}) },
      year: {
        ...base.year,
        ...(overrides.year || {}),
        label: { ...base.year.label, ...(overrides.year?.label || {}) },
      },
      week: {
        ...base.week,
        ...(overrides.week || {}),
        label: { ...base.week.label, ...(overrides.week?.label || {}) },
      },
      selection: { ...base.selection, ...(overrides.selection || {}) },
    };
  }

  private smooth(
    value: number,
    target: number,
    rate: number,
    deltaMs: number,
  ): number {
    const decay = Math.exp(-deltaMs * rate);
    return target + (value - target) * decay;
  }

  private mixColor(a: number, b: number, t: number): number {
    const clampT = Math.max(0, Math.min(1, t));
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;

    const r = Math.round(ar + (br - ar) * clampT);
    const g = Math.round(ag + (bg - ag) * clampT);
    const bl = Math.round(ab + (bb - ab) * clampT);

    return (r << 16) | (g << 8) | bl;
  }

  private mixSpanColors(spans: { color: number }[]): number | null {
    if (!spans.length) return null;
    let r = 0;
    let g = 0;
    let b = 0;

    spans.forEach((span) => {
      r += (span.color >> 16) & 0xff;
      g += (span.color >> 8) & 0xff;
      b += span.color & 0xff;
    });

    const count = spans.length;
    return ((Math.round(r / count) << 16) | (Math.round(g / count) << 8) |
      Math.round(b / count)) >>> 0;
  }
}
