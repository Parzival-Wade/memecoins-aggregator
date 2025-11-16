import { describe, it, expect } from "vitest";
import { diffObjects } from "../../src/aggregator/logic";

describe("diffObjects()", () => {
  it("returns entire new object if old is null", () => {
    const newObj = { a: 1, b: 2 };
    const diff = diffObjects(null, newObj);
    expect(diff).toEqual(newObj);
  });

  it("returns only changed fields", () => {
    const oldObj = { a: 1, b: 2, c: 3 };
    const newObj = { a: 1, b: 20, c: 3 };
    const diff = diffObjects(oldObj, newObj);

    expect(diff).toEqual({ b: 20 });
  });

  it("detects added fields", () => {
    const oldObj = { a: 1 };
    const newObj = { a: 1, b: 5 };
    const diff = diffObjects(oldObj, newObj);

    expect(diff).toEqual({ b: 5 });
  });

  it("detects removed fields (treated as changed)", () => {
    const oldObj = { a: 1, b: 2 };
    const newObj = { a: 1 };
    const diff = diffObjects(oldObj, newObj);

    expect(diff).toEqual({ b: undefined });
  });

  it("deep structures: detects JSON inequality", () => {
    const oldObj = { nested: { x: 10 } };
    const newObj = { nested: { x: 11 } };
    const diff = diffObjects(oldObj, newObj);

    expect(diff).toEqual({ nested: { x: 11 } });
  });

  it("handles primitive → object change", () => {
    const oldObj = { a: 5 };
    const newObj = { a: { v: 5 } };
    const diff = diffObjects(oldObj, newObj);

    expect(diff).toEqual({ a: { v: 5 } });
  });
});
