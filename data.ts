export type LifeEventType = 'milestone' | 'default' | string;

export interface LifeEvent {
  date: Date;
  title: string;
  type: LifeEventType;
}

export interface LifeSpan {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date | null;
  color: number;
}

export interface LifeSpanWithBounds extends LifeSpan {
  startWeekIndex: number;
  endWeekIndex: number;
}

export interface LifeWeek {
  index: number;
  yearIndex: number;
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  isPast: boolean;
  isCurrent: boolean;
  events: LifeEvent[];
  spans: LifeSpanWithBounds[];
}

export class LifeData {
  birthDate: Date;
  lifeExpectancyYears: number;
  events: LifeEvent[] = [];
  weeks: LifeWeek[] = [];
  spans: LifeSpan[] = [];
  spansWithBounds: LifeSpanWithBounds[] = [];

  constructor(birthDate: string | Date, lifeExpectancyYears: number = 90) {
    this.birthDate = new Date(birthDate);
    this.lifeExpectancyYears = lifeExpectancyYears;
  }

  addEvent(date: string | Date, title: string, type: LifeEventType = 'default') {
    this.events.push({ date: new Date(date), title, type });
  }

  addSpan(startDate: string | Date, endDate: string | Date | null, title: string, color: number) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    const normalizedStart = isNaN(start.getTime()) ? new Date() : start;
    let safeEnd: Date | null = null;
    if (end && !isNaN(end.getTime())) {
      safeEnd = normalizedStart <= end ? end : normalizedStart;
    }

    this.spans.push({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      startDate: safeStart,
      endDate: safeEnd,
      color,
    });
  }

  generateWeeks(): LifeWeek[] {
    const weeks: LifeWeek[] = [];
    const totalWeeks = this.lifeExpectancyYears * 52;
    const oneWeekMs = 1000 * 60 * 60 * 24 * 7;
    const now = new Date();
    const spansWithBounds = this.computeSpanBounds(totalWeeks, oneWeekMs);

    for (let i = 0; i < totalWeeks; i++) {
      const weekStartDate = new Date(this.birthDate.getTime() + i * oneWeekMs);
      const weekEndDate = new Date(weekStartDate.getTime() + oneWeekMs);

      const weekEvents = this.events.filter(
        (event) => event.date >= weekStartDate && event.date < weekEndDate
      );
      const weekSpans = spansWithBounds.filter(
        (span) => i >= span.startWeekIndex && i <= span.endWeekIndex
      );

      weeks.push({
        index: i,
        yearIndex: Math.floor(i / 52),
        weekIndex: i % 52,
        startDate: weekStartDate,
        endDate: weekEndDate,
        isPast: weekEndDate < now,
        isCurrent: weekStartDate <= now && weekEndDate > now,
        events: weekEvents,
        spans: weekSpans,
      });
    }

    this.weeks = weeks;
    this.spansWithBounds = spansWithBounds;
    return weeks;
  }

  private computeSpanBounds(totalWeeks: number, oneWeekMs: number): LifeSpanWithBounds[] {
    const birthMs = this.birthDate.getTime();
    const maxIndex = totalWeeks - 1;
    const currentWeekIndex = Math.min(
      maxIndex,
      Math.max(0, Math.floor((Date.now() - birthMs) / oneWeekMs))
    );

    return this.spans.map((span) => {
      const startIdx = Math.max(
        0,
        Math.min(maxIndex, Math.floor((span.startDate.getTime() - birthMs) / oneWeekMs))
      );
      const computedEndIdx = span.endDate
        ? Math.min(
            maxIndex,
            Math.floor((span.endDate.getTime() - birthMs) / oneWeekMs)
          )
        : currentWeekIndex;
      const endIdx = Math.max(startIdx, Math.min(currentWeekIndex, computedEndIdx));

      return {
        ...span,
        startWeekIndex: startIdx,
        endWeekIndex: endIdx,
      };
    });
  }
}
