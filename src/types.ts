export type GoalKind = "daily" | "longTerm";
export type GoalPriority = "low" | "medium" | "high";
export type CheckInStatus = "completed" | "skipped" | "moved";
export type Mood = "steady" | "good" | "hard" | "spark";

export interface Goal {
  id: string;
  title: string;
  kind: GoalKind;
  color: string;
  priority: GoalPriority;
  startDate: string;
  endDate?: string;
  targetValue?: number;
  unit?: string;
  cadenceDays?: number[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  note?: string;
}

export interface CheckIn {
  id: string;
  goalId: string;
  date: string;
  status: CheckInStatus;
  progressValue?: number;
  note?: string;
  mood?: Mood;
  createdAt: string;
  updatedAt: string;
}

export interface Journal {
  id: string;
  date: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportData {
  exportedAt: string;
  version: 1;
  goals: Goal[];
  checkIns: CheckIn[];
  journals: Journal[];
}
