import { describe, expect, it } from "vitest";
import { Portfolio } from "../portfolio.model";

describe("portfolio indexes", () => {
  it("does not combine multiple array fields in one compound index", () => {
    const arrayFields = new Set(["specialites", "styles", "services"]);

    for (const [index] of Portfolio.schema.indexes()) {
      const indexedArrayFields = Object.keys(index).filter((field) => arrayFields.has(field));
      expect(indexedArrayFields.length).toBeLessThanOrEqual(1);
    }
  });
});
