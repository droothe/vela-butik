import { describe, expect, it } from "vitest";
import { remainingForFreeShipping } from "@/lib/catalog";

describe("free shipping", () => {
  it("shows remaining amount below threshold", () => {
    expect(remainingForFreeShipping(1350)).toBe(150);
  });
  it("is free at or above 1500 TL", () => {
    expect(remainingForFreeShipping(1500)).toBe(0);
    expect(remainingForFreeShipping(2000)).toBe(0);
  });
});
