import { describe, expect, it } from "vitest";
import { moveSub, subDragPreview, type Sub } from "../routes/index";

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

describe("subDragPreview", () => {
  const rows = [
    { id: "a", top: 0, height: 24, done: false },
    { id: "b", top: 32, height: 48, done: false },
    { id: "c", top: 88, height: 24, done: false },
    { id: "d", top: 120, height: 24, done: true },
  ];
  it("keeps the dragged row inside its group at both list edges", () => {
    expect(subDragPreview(rows, "a", 1000).offsets["a"]).toBe(88);
    expect(subDragPreview(rows, "c", -1000).offsets["c"]).toBe(-88);
    expect(subDragPreview(rows, "b", 1000).offsets["b"]).toBe(32);
    expect(subDragPreview(rows, "d", -1000).offsets["d"]).toBe(0);
  });
  it("follows the pointer continuously through a reorder threshold without changing the original rows", () => {
    expect(subDragPreview(rows, "a", 43).offsets["a"]).toBe(43);
    expect(subDragPreview(rows, "a", 45).offsets["a"]).toBe(45);
    expect(subDragPreview(rows, "a", 45).target).toBe(1);
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c", "d"]);
  });
});
