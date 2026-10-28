import { describe, it, expect } from "vitest";
import { resolveOverlaps } from "@/routes/index";
import type { Task } from "@/routes/index";

const t = (start: number, minutes: number): Task => ({ id: String(start), name: "", minutes, start, subs: [] });

describe("resolveOverlaps", () => {
  it("moves a card dropped on another below it", () => {
    const out = resolveOverlaps([t(9 * 60, 60), t(9 * 60 + 30, 30)]);
    expect(out.map((x) => x.start)).toEqual([9 * 60, 10 * 60]);
  });
  it("shifts later cards down when a card grows into them", () => {
    const out = resolveOverlaps([t(9 * 60, 120), t(10 * 60, 30), t(11 * 60, 30)]);
    expect(out.map((x) => x.start)).toEqual([9 * 60, 11 * 60, 11 * 60 + 30]);
  });
  it("keeps gaps between cards that do not overlap", () => {
    const out = resolveOverlaps([t(8 * 60, 30), t(10 * 60, 30)]);
    expect(out.map((x) => x.start)).toEqual([8 * 60, 10 * 60]);
  });
  it("only shifts the cards that actually overlap", () => {
    const out = resolveOverlaps([t(8 * 60, 60), t(9 * 60, 60), t(9 * 60 + 15, 30), t(12 * 60, 30)]);
    expect(out.map((x) => x.start)).toEqual([8 * 60, 9 * 60, 10 * 60, 12 * 60]);
  });
});
