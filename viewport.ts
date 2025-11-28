import { Application, Container } from 'pixi.js';
import { ViewportConfig, defaultViewportConfig } from './config.ts';

export class ViewportManager {
  app: Application;
  container: Container;
  isDragging = false;
  lastPos: { x: number; y: number } | null = null;
  targetScale = 1;
  targetPosition = { x: 0, y: 0 };
  config: ViewportConfig;

  constructor(app: Application, container: Container, overrides: Partial<ViewportConfig> = {}) {
    this.app = app;
    this.container = container;
    this.config = { ...defaultViewportConfig, ...overrides };
    this.targetScale = this.container.scale.x || 1;
    this.targetPosition = { x: this.container.x, y: this.container.y };

    this.app.canvas.addEventListener('wheel', this.onWheel.bind(this));
    this.app.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.app.canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.app.canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.app.canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));
    this.app.ticker.add(this.update.bind(this));
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = this.config.zoomFactor;
    const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

    const rect = this.app.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const worldPos = {
      x: (x - this.container.x) / this.container.scale.x,
      y: (y - this.container.y) / this.container.scale.y,
    };

    const newScale = Math.min(Math.max(this.targetScale * direction, this.config.minScale), this.config.maxScale);
    this.targetScale = newScale;
    this.targetPosition = {
      x: x - worldPos.x * newScale,
      y: y - worldPos.y * newScale,
    };
  }

  onPointerDown(e: PointerEvent) {
    this.isDragging = true;
    this.lastPos = { x: e.clientX, y: e.clientY };
    this.app.canvas.style.cursor = 'grabbing';
  }

  onPointerMove(e: PointerEvent) {
    if (!this.isDragging || !this.lastPos) return;

    const dx = e.clientX - this.lastPos.x;
    const dy = e.clientY - this.lastPos.y;

    this.container.x += dx;
    this.container.y += dy;
    this.targetPosition = { x: this.container.x, y: this.container.y };

    this.lastPos = { x: e.clientX, y: e.clientY };
  }

  onPointerUp() {
    this.isDragging = false;
    this.lastPos = null;
    this.app.canvas.style.cursor = 'default';
  }

  private update() {
    const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt;

    const nextScale = lerp(this.container.scale.x, this.targetScale, this.config.scaleLerp);
    this.container.scale.set(nextScale);

    const nextX = lerp(this.container.x, this.targetPosition.x, this.config.positionLerp);
    const nextY = lerp(this.container.y, this.targetPosition.y, this.config.positionLerp);
    this.container.position.set(nextX, nextY);
  }
}
