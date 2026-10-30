import { describe, expect, it } from "vitest";
import { placeAround, type Task } from "../routes/index";

const t = (id: string, start: number, minutes = 30): Task => ({ id, name: id, minutes, start, subs: [] });

describe("placeAround", () => {
  it("keeps the moved task at its exact old time", () => {
    const out = placeAround(t("a", 600), []);
    expect(out).toHaveLength(1);
    expect(out[0]!.start).toBe(600);
  });

  it("keeps existing cards where they are and slides the moved card below when the slot is taken", () => {
    const out = placeAround(t("moved", 600), [t("b", 600)]);
    expect(out.find((x) => x.id === "b")!.start).toBe(600);
    expect(out.find((x) => x.id === "moved")!.start).toBe(630);
  });

  it("slides the moved card below an existing card that starts earlier but overlaps it", () => {
    const out = placeAround(t("moved", 600), [t("b", 585)]);
    expect(out.find((x) => x.id === "b")!.start).toBe(585);
    expect(out.find((x) => x.id === "moved")!.start).toBe(615);
  });

  it("leaves non-colliding cards untouched and keeps the moved time", () => {
    const out = placeAround(t("moved", 600), [t("b", 660), t("c", 480)]);
    expect(out.find((x) => x.id === "b")!.start).toBe(660);
    expect(out.find((x) => x.id === "c")!.start).toBe(480);
    expect(out.find((x) => x.id === "moved")!.start).toBe(600);
  });

  it("never leaves overlaps when the moved card must slide past several cards", () => {
    const out = placeAround(t("moved", 600), [t("b", 590), t("c", 625)]);
    const sorted = [...out].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++)
      expect(sorted[i]!.start).toBeGreaterThanOrEqual(sorted[i - 1]!.start + sorted[i - 1]!.minutes);
    // existing cards stay put
    expect(out.find((x) => x.id === "b")!.start).toBe(590);
    expect(out.find((x) => x.id === "c")!.start).toBe(625);
    expect(out.find((x) => x.id === "moved")!.start).toBe(655);
  });
});
