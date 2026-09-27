import { describe, expect, it } from "vitest";
import { filterCompletedCompletions } from "./achievements.service";

describe("filterCompletedCompletions", () => {
  it("keeps only completed workouts and sorts them chronologically", () => {
    const rows = [
      { id: "pending", completedAt: null },
      { id: "older", completedAt: new Date("2024-01-01T00:00:00.000Z") },
      { id: "newer", completedAt: new Date("2024-01-03T00:00:00.000Z") },
    ] as any[];

    expect(filterCompletedCompletions(rows).map((row) => row.id)).toEqual([
      "older",
      "newer",
    ]);
  });
});
