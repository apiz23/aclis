import { describe, it, expect, vi } from "vitest";
import { buildAuthHeaders } from "@/lib/api";

describe("buildAuthHeaders", () => {
  it("adds bearer token when session exists", () => {
    const h = buildAuthHeaders("abc123");
    expect(h.Authorization).toBe("Bearer abc123");
  });
  it("omits auth header when no token", () => {
    const h = buildAuthHeaders(null);
    expect(h.Authorization).toBeUndefined();
  });
});
