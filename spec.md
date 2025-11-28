# Interactive Life Calendar - Specification

## 1. Core Concept
A visualization of a human life broken down into weeks.
- [x] **Rows**: Represent years of life.
- [x] **Columns**: Represent the 52 weeks in a year.
- [x] **Total Duration**: Configurable life expectancy (default e.g., 80 or 90 years).
- [x] **Start Date**: User's birth date.

## 2. Visualization & Layouts
The application must support multiple ways to visualize the timeline.

### 2.1. Rectangular Grid (Default)
- [x] Standard row/column layout.
- [x] Clear distinction between past (filled), present (highlighted), and future (empty/ghosted).

### 2.2. Alternative Layouts
- [ ] **Spiral**: Weeks spiraling outwards from birth.
- [ ] **Space-Filling Curves**: Hilbert or Peano curves to represent continuity in a compact space.
- [ ] **Freeform/Organic**: Potential for physics-based or organic arrangements.

## 3. Interaction
The user interface must be highly interactive and fluid.

### 3.1. Navigation
- [x] **Zooming**: Smooth zoom from a "whole life" view down to individual weeks or days.
- [x] **Panning**: Infinite canvas-style panning (constrained to the life bounds).
- [ ] **Focus**: Ability to "focus" on specific dates or periods.

### 3.2. Selection & Details
- [ ] **Hover Effects**: Tooltips showing date ranges and summary of events.
- [ ] **Click/Tap**: Opens a detailed view for a specific week/period.
- [ ] **Editing**: Interface to add/edit events and spans directly on the calendar.

## 4. Data Model
The system needs to handle different types of temporal data.

### 4.1. Events (Point in Time)
- [x] Specific dates or moments.
- [x] Examples: Birthdays, graduations, milestones, specific memories.
- [ ] Metadata: Title, Description, Date, Category/Tag, Media (optional).

### 4.2. Spans (Periods)
- [ ] Durations of time.
- [ ] Examples: High School, College, Living in City X, Relationship Y, Job Z.
- [ ] Metadata: Title, Start Date, End Date, Color/Style, Category.
- [ ] Visualization: Background colors, connecting lines, or borders spanning multiple weeks.

## 5. Aesthetics & Experience
The goal is a "premium," "wow" experience.

### 5.1. Visuals
- [ ] **Style**: Modern, clean, potentially using shaders for effects.
- [ ] **Post-processing**: Bloom, chromatic aberration, or film grain (configurable/subtle).
- [ ] **Animations**:
    - [ ] Smooth transitions between layouts.
    - [ ] Entry animations for data.
    - [ ] Micro-animations on hover/click.

### 5.3. Organic Motion & Responsiveness
- [ ] **Living Grid**: Week cells are never static—per-cell offsets, scale or warp oscillations create a slow breathing motion with subtle randomness so the grid feels alive without harming readability.
- [ ] **Responsive Touch/Pointer**: Cells react to hover/touch with local warps or pushes rather than uniform highlights; nearby cells should nudge/tilt/scale to imply depth and tactility.
- [ ] **Non-Uniformity**: Break perfect alignment with controlled jitter and curve-based distortions so rows/columns feel organic while preserving legibility and hit-target accuracy.
- [ ] **Zoom Feeling**: Zoom should feel like cells moving closer to the viewer (parallax, eased zooming, anchor-aware scaling toward the cursor/tap) rather than an instant scale jump.
- [ ] **Pacing & Comfort**: Motion intensity is capped; idle motion remains sub-perceptual in the periphery, ramps up near interactions, and eases back to calm baselines.
- [ ] **Configurability**: Provide tuning knobs for motion strength, jitter amplitude, hover influence radius, and zoom responsiveness to balance personality vs. usability.
- [ ] **Airy Layout**: Increase gutters and consider non-square silhouettes (rounded blobs/circles) to keep the grid breathable and organic.
- [ ] **Color-Forward Feedback**: Cursor/touch proximity should be conveyed with color/tint halos rather than displacement, so targets remain easy to hover/click.

### 5.2. Audio
- [ ] **Sound Effects**: Subtle clicks/ticks when hovering or selecting.
- [ ] **Ambience**: Optional background generative audio based on the current "age" or density of events.

## 6. Technical Considerations (To Be Decided)
- [x] **Rendering**: Likely WebGL (Three.js or Pixi.js) or highly optimized Canvas API for performance with many nodes (4000+ weeks).
- [ ] **State Management**: Needs to handle complex zoom/pan state and data overlays.
- [ ] **Storage**: LocalStorage for MVP, potential for file export/import (JSON), or cloud sync later.

## 7. Open Questions
- [ ] **Data Storage**: Should this be local-only initially?
- [ ] **Mobile Support**: Is this primarily desktop or fully responsive?
- [ ] **Life Expectancy**: Fixed or dynamic/actuarial?
