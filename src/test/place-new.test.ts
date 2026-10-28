import { describe, it, expect } from "vitest";
import { placeNew } from "@/routes/index";

describe("placeNew", () => {
  it("places a new task at the current time when free", () => {
    expect(placeNew([], 14 * 60 + 52, 30)).toBe(14 * 60 + 50);
  });
  it("places it under a task that already occupies now", () => {
    expect(placeNew([{ start: 14 * 60, minutes: 60 }], 14 * 60 + 30, 30)).toBe(15 * 60);
  });
});
