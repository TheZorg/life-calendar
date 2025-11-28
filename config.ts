export interface GridIdleMotion {
  jitter: number;
  jitterSpeed: number;
  breathingAmount: number;
  breathingSpeed: number;
}

export interface GridLabelStyle {
  padding: number;
  radius: number;
  bg: number;
  text: number;
  followRate: number;
}

export interface GridHoverMotion {
  radius: number;
  detectRadius: number;
  heatDecay: number;
  magnifyStrength: number;
  magnifyExponent: number;
}

export interface GridSelectionMotion {
  color: number;
  outlineColor: number;
  outlineAlpha: number;
  scaleBoost: number;
  pulseAmount: number;
  pulseSpeed: number;
  followRate: number;
}

export interface GridYearMotion {
  highlightColor: number;
  highlightMix: number;
  highlightScale: number;
  followRate: number;
  label: GridLabelStyle;
}

export interface GridWeekMotion {
  label: GridLabelStyle;
  offset: number;
}

export interface GridMotionConfig {
  idle: GridIdleMotion;
  hover: GridHoverMotion;
  year: GridYearMotion;
  selection: GridSelectionMotion;
  week: GridWeekMotion;
}

export interface GridPalette {
  future: number;
  past: number;
  current: number;
  event: number;
}

export interface PostProcessingBloomConfig {
  enabled: boolean;
  threshold: number;
  bloomScale: number;
  brightness: number;
  blur: number;
}

export interface PostProcessingAberrationConfig {
  amount: number;
  jitter: number;
  animated: boolean;
}

export interface PostProcessingGrainConfig {
  amount: number;
  seed: number;
  animated: boolean;
}

export interface PostProcessingConfig {
  enabled: boolean;
  bloom: PostProcessingBloomConfig;
  aberration: PostProcessingAberrationConfig;
  grain: PostProcessingGrainConfig;
}

export const defaultGridMotion: GridMotionConfig = {
  idle: {
    jitter: 0.9,
    jitterSpeed: 0.0016,
    breathingAmount: 0.06,
    breathingSpeed: 0.0011,
  },
  hover: {
    radius: 80,
    detectRadius: 18,
    heatDecay: 0.0028,
    magnifyStrength: 0.4,
    magnifyExponent: 0.8,
  },
  year: {
    highlightColor: 0x3f7cac,
    highlightMix: 0.65,
    highlightScale: 0.08,
    followRate: 0.004,
    label: {
      padding: 7,
      radius: 7,
      bg: 0x0b0d10,
      text: 0xf9f7f4,
      followRate: 0.0045,
    },
  },
  selection: {
    color: 0xfff5c3,
    outlineColor: 0xffffff,
    outlineAlpha: 0.55,
    scaleBoost: 0.3,
    pulseAmount: 0.05,
    pulseSpeed: 0.006,
    followRate: 0.006,
  },
  week: {
    label: {
      padding: 6,
      radius: 6,
      bg: 0x0b0d10,
      text: 0xf4f1de,
      followRate: 0.005,
    },
    offset: 16,
  },
};

export const defaultGridPalette: GridPalette = {
  future: 0x2f3338,
  past: 0xffffff,
  current: 0xffeb3b,
  event: 0xe27d9a,
};

export const defaultPostProcessing: PostProcessingConfig = {
  enabled: true,
  bloom: {
    enabled: false,
    threshold: 0.65,
    bloomScale: 0.8,
    brightness: 1.05,
    blur: 3,
  },
  aberration: {
    amount: 2.8,
    jitter: 1.2,
    animated: true,
  },
  grain: {
    amount: 0.08,
    seed: 0.37,
    animated: true,
  },
};

export interface ViewportConfig {
  zoomFactor: number;
  maxScale: number;
  minScale: number;
  scaleLerp: number;
  positionLerp: number;
}

export const defaultViewportConfig: ViewportConfig = {
  zoomFactor: 1.03,
  maxScale: 10,
  minScale: 0.1,
  scaleLerp: 0.18,
  positionLerp: 0.22,
};
