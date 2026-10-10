export type DayOfWeek = 1 | 2 | 3 | 4 | 5; // Monday to Friday

export interface Slot {
  id: string;
  day: DayOfWeek;
  type: 'OPENING' | 'BREAK' | 'CLOSING';
  afterLesson?: number; // E.g., break after 2nd lesson
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  zoneSpecificIds?: string[]; // If set, this slot only applies to these zones
}

export interface Zone {
  id: string;
  name: string;
  priority: number; // 1 = Highest
  minStaff: number; // E.g., 1
  idealStaff: number; // E.g., 2
  riskMultiplier: number;
  startPeriod?: number;
  endPeriod?: number;
  activeSlotTypes?: ('OPENING' | 'BREAK' | 'CLOSING')[]; 
}

export interface Teacher {
  id: string;
  name: string;
  branch: string;
  isExcluded: boolean;
  excludedUntil?: string; // Rehber, idareci, ücretli vb.
  historyStats: {
    totalScore: number;
    zoneCounts: Record<string, number>;
  };
}

export interface Lesson {
  id: string;
  day: DayOfWeek;
  period: number; // 1, 2, 3...
  className: string;
  teacherId: string;
}

// Determines if a teacher can do duty on a specific slot
export interface Availability {
  canDuty: boolean;
  reason?: string; 
}

export interface Assignment {
  id: string;
  slotId: string;
  zoneId: string;
  teacherId: string;
  isManual: boolean;
}

export interface DutyPlan {
  id: string;
  weekStartDate: string; // YYYY-MM-DD
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  assignments: Assignment[];
}
