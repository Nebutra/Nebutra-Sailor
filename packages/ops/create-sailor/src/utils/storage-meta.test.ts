import { describe, expect, it } from "vitest";
import { getStorageProvider, normalizeStorageProviderId } from "./storage-meta.js";

describe("storage provider metadata", () => {
  it("keeps supabase-storage as the canonical provider id", () => {
    expect(normalizeStorageProviderId("supabase-storage")).toBe("supabase-storage");
    expect(getStorageProvider("supabase-storage")?.name).toBe("Supabase Storage");
  });

  it("accepts the legacy supabase alias for compatibility", () => {
    expect(normalizeStorageProviderId("supabase")).toBe("supabase-storage");
    expect(getStorageProvider("supabase")?.id).toBe("supabase-storage");
  });
});
