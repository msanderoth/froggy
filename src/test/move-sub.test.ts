import { describe, expect, it } from "vitest";
import { moveSub, type Sub } from "../routes/index";

const s = (id: string, done = false): Sub => ({ id, name: id, done });

describe("moveSub", () => {
  it("reorders open sub-tasks within the open group", () => {
    const out = moveSub([s("a"), s("b"), s("c")], 0, 2);
    expect(out.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("an open sub-task can never be dragged below the checked ones", () => {
    const out = moveSub([s("a"), s("b"), s("c", true), s("d", true)], 0, 3);
    expect(out.map((x) => x.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("a checked sub-task can never be dragged above the open ones", () => {
    const out = moveSub([s("a"), s("b"), s("c", true)], 2, 0);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("checked sub-tasks reorder freely among themselves", () => {
    const out = moveSub([s("a"), s("b", true), s("c", true), s("d", true)], 1, 3);
    expect(out.map((x) => x.id)).toEqual(["a", "c", "d", "b"]);
  });
});
