export type LifeEventType = 'milestone' | 'default' | string;

export interface LifeEvent {
  date: Date;
  title: string;
  type: LifeEventType;
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
}

export class LifeData {
  birthDate: Date;
  lifeExpectancyYears: number;
  events: LifeEvent[] = [];
  weeks: LifeWeek[] = [];

  constructor(birthDate: string | Date, lifeExpectancyYears: number = 90) {
    this.birthDate = new Date(birthDate);
    this.lifeExpectancyYears = lifeExpectancyYears;
  }

  addEvent(date: string | Date, title: string, type: LifeEventType = 'default') {
    this.events.push({ date: new Date(date), title, type });
  }

  generateWeeks(): LifeWeek[] {
    const weeks: LifeWeek[] = [];
    const totalWeeks = this.lifeExpectancyYears * 52;
    const oneWeekMs = 1000 * 60 * 60 * 24 * 7;
    const now = new Date();

    for (let i = 0; i < totalWeeks; i++) {
      const weekStartDate = new Date(this.birthDate.getTime() + i * oneWeekMs);
      const weekEndDate = new Date(weekStartDate.getTime() + oneWeekMs);

      const weekEvents = this.events.filter(
        (event) => event.date >= weekStartDate && event.date < weekEndDate
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
      });
    }

    this.weeks = weeks;
    return weeks;
  }
}
