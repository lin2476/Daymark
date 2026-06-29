import Dexie, { type Table } from "dexie";
import type { CheckIn, Goal, Journal } from "./types";

class GoalLedgerDb extends Dexie {
  goals!: Table<Goal, string>;
  checkIns!: Table<CheckIn, string>;
  journals!: Table<Journal, string>;

  constructor() {
    super("goal-ledger-db");
    this.version(1).stores({
      goals: "id, kind, startDate, endDate, archivedAt, updatedAt",
      checkIns: "id, goalId, date, [goalId+date], status, updatedAt",
      journals: "id, date, updatedAt",
    });
  }
}

export const db = new GoalLedgerDb();
