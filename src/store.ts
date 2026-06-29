import { create } from "zustand";
import { db } from "./db";
import type { CheckIn, CheckInStatus, ExportData, Goal, Journal, Mood } from "./types";

const id = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const nowIso = () => new Date().toISOString();

interface GoalDraft {
  title: string;
  kind: Goal["kind"];
  color: string;
  priority: Goal["priority"];
  startDate: string;
  endDate?: string;
  targetValue?: number;
  unit?: string;
  cadenceDays?: number[];
  note?: string;
}

interface CheckInPayload {
  status: CheckInStatus;
  progressValue?: number;
  note?: string;
  mood?: Mood;
}

interface LedgerState {
  goals: Goal[];
  checkIns: CheckIn[];
  journals: Journal[];
  isReady: boolean;
  load: () => Promise<void>;
  addGoal: (draft: GoalDraft) => Promise<void>;
  updateGoal: (goalId: string, patch: Partial<GoalDraft>) => Promise<void>;
  archiveGoal: (goalId: string) => Promise<void>;
  restoreGoal: (goalId: string) => Promise<void>;
  removeGoal: (goalId: string) => Promise<void>;
  upsertCheckIn: (goalId: string, date: string, payload: CheckInPayload) => Promise<void>;
  removeCheckIn: (checkInId: string) => Promise<void>;
  saveJournal: (date: string, text: string) => Promise<void>;
  exportData: () => ExportData;
  importData: (data: ExportData) => Promise<void>;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  goals: [],
  checkIns: [],
  journals: [],
  isReady: false,

  load: async () => {
    const [goals, checkIns, journals] = await Promise.all([
      db.goals.orderBy("updatedAt").reverse().toArray(),
      db.checkIns.orderBy("updatedAt").reverse().toArray(),
      db.journals.orderBy("updatedAt").reverse().toArray(),
    ]);
    set({ goals, checkIns, journals, isReady: true });
  },

  addGoal: async (draft) => {
    const timestamp = nowIso();
    const goal: Goal = {
      id: id(),
      title: draft.title.trim(),
      kind: draft.kind,
      color: draft.color,
      priority: draft.priority,
      startDate: draft.startDate,
      endDate: draft.endDate || undefined,
      targetValue: draft.targetValue,
      unit: draft.unit?.trim() || undefined,
      cadenceDays: draft.cadenceDays,
      note: draft.note?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.goals.add(goal);
    set((state) => ({ goals: [goal, ...state.goals] }));
  },

  updateGoal: async (goalId, patch) => {
    const updatedAt = nowIso();
    const update: Partial<Goal> = { ...patch, updatedAt };
    if (patch.title !== undefined) update.title = patch.title.trim();
    if (patch.unit !== undefined) update.unit = patch.unit.trim() || undefined;
    if (patch.note !== undefined) update.note = patch.note.trim() || undefined;
    await db.goals.update(goalId, update);
    set((state) => ({
      goals: state.goals.map((goal) => (goal.id === goalId ? { ...goal, ...update } : goal)),
    }));
  },

  archiveGoal: async (goalId) => {
    const archivedAt = nowIso();
    await db.goals.update(goalId, { archivedAt, updatedAt: archivedAt });
    set((state) => ({
      goals: state.goals.map((goal) => (goal.id === goalId ? { ...goal, archivedAt, updatedAt: archivedAt } : goal)),
    }));
  },

  restoreGoal: async (goalId) => {
    const updatedAt = nowIso();
    await db.goals.update(goalId, { archivedAt: undefined, updatedAt });
    set((state) => ({
      goals: state.goals.map((goal) => (goal.id === goalId ? { ...goal, archivedAt: undefined, updatedAt } : goal)),
    }));
  },

  removeGoal: async (goalId) => {
    await db.transaction("rw", db.goals, db.checkIns, async () => {
      await db.goals.delete(goalId);
      await db.checkIns.where("goalId").equals(goalId).delete();
    });
    set((state) => ({
      goals: state.goals.filter((goal) => goal.id !== goalId),
      checkIns: state.checkIns.filter((checkIn) => checkIn.goalId !== goalId),
    }));
  },

  upsertCheckIn: async (goalId, date, payload) => {
    const timestamp = nowIso();
    const existing = get().checkIns.find((checkIn) => checkIn.goalId === goalId && checkIn.date === date);
    const checkIn: CheckIn = existing
      ? { ...existing, ...payload, updatedAt: timestamp }
      : {
          id: id(),
          goalId,
          date,
          status: payload.status,
          progressValue: payload.progressValue,
          note: payload.note,
          mood: payload.mood,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    await db.checkIns.put(checkIn);
    set((state) => ({
      checkIns: existing
        ? state.checkIns.map((item) => (item.id === existing.id ? checkIn : item))
        : [checkIn, ...state.checkIns],
    }));
  },

  removeCheckIn: async (checkInId) => {
    await db.checkIns.delete(checkInId);
    set((state) => ({ checkIns: state.checkIns.filter((checkIn) => checkIn.id !== checkInId) }));
  },

  saveJournal: async (date, text) => {
    const timestamp = nowIso();
    const existing = get().journals.find((journal) => journal.date === date);
    const journal: Journal = existing
      ? { ...existing, text, updatedAt: timestamp }
      : { id: id(), date, text, createdAt: timestamp, updatedAt: timestamp };

    if (!text.trim() && existing) {
      await db.journals.delete(existing.id);
      set((state) => ({ journals: state.journals.filter((item) => item.id !== existing.id) }));
      return;
    }

    if (!text.trim()) return;

    await db.journals.put(journal);
    set((state) => ({
      journals: existing
        ? state.journals.map((item) => (item.id === existing.id ? journal : item))
        : [journal, ...state.journals],
    }));
  },

  exportData: () => ({
    exportedAt: nowIso(),
    version: 1,
    goals: get().goals,
    checkIns: get().checkIns,
    journals: get().journals,
  }),

  importData: async (data) => {
    if (data.version !== 1 || !Array.isArray(data.goals) || !Array.isArray(data.checkIns) || !Array.isArray(data.journals)) {
      throw new Error("备份文件格式不正确");
    }

    await db.transaction("rw", db.goals, db.checkIns, db.journals, async () => {
      await Promise.all([db.goals.clear(), db.checkIns.clear(), db.journals.clear()]);
      await db.goals.bulkPut(data.goals);
      await db.checkIns.bulkPut(data.checkIns);
      await db.journals.bulkPut(data.journals);
    });
    set({ goals: data.goals, checkIns: data.checkIns, journals: data.journals });
  },
}));
