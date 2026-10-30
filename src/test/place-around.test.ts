import { describe, expect, it } from "vitest";
import { placeAround, type Task } from "../routes/index";

const t = (id: string, start: number, minutes = 30): Task => ({ id, name: id, minutes, start, subs: [] });

describe("placeAround", () => {
  it("keeps the moved task at its exact old time", () => {
    const [moved] = placeAround(t("a", 600), []);
    expect(moved.start).toBe(600);
  });

  it("keeps the moved task's time when an old card sits exactly there, sliding the old card below", () => {
    const out = placeAround(t("moved", 600), [t("b", 600)]);
    expect(out.find((x) => x.id === "moved")!.start).toBe(600);
    expect(out.find((x) => x.id === "b")!.start).toBe(630);
  });

  it("slides an old card below even when it starts before the moved card but overlaps it", () => {
    const out = placeAround(t("moved", 600), [t("b", 585)]);
    expect(out.find((x) => x.id === "moved")!.start).toBe(600);
    expect(out.find((x) => x.id === "b")!.start).toBe(630);
  });

  it("leaves non-colliding cards untouched", () => {
    const out = placeAround(t("moved", 600), [t("b", 660), t("c", 480)]);
    expect(out.find((x) => x.id === "b")!.start).toBe(660);
    expect(out.find((x) => x.id === "c")!.start).toBe(480);
  });

  it("never leaves overlaps when several old cards collide", () => {
    const out = placeAround(t("moved", 600), [t("b", 590), t("c", 615)]);
    const sorted = [...out].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++)
      expect(sorted[i]!.start).toBeGreaterThanOrEqual(sorted[i - 1]!.start + sorted[i - 1]!.minutes);
  });
});
