import { describe, expect, it } from "vitest";
import {
  createDocumentValidationRules,
  createImageValidationRules,
  validateImageDimensions,
  validateUpload,
} from "../validation";

describe("validateUpload", () => {
  it("returns null for valid files with default rules", () => {
    const result = validateUpload("photo.jpg", 1024, "image/jpeg");
    expect(result).toBeNull();
  });

  it("rejects files exceeding max size", () => {
    const result = validateUpload("huge.bin", 200 * 1024 * 1024, "application/octet-stream");
    expect(result).not.toBeNull();
    expect(result?.code).toBe("size_exceeded");
  });

  it("rejects files with custom smaller max size", () => {
    const result = validateUpload("doc.pdf", 6 * 1024 * 1024, "application/pdf", {
      maxSize: 5 * 1024 * 1024,
    });
    expect(result).not.toBeNull();
    expect(result?.code).toBe("size_exceeded");
  });

  it("accepts files within custom max size", () => {
    const result = validateUpload("doc.pdf", 4 * 1024 * 1024, "application/pdf", {
      maxSize: 5 * 1024 * 1024,
    });
    expect(result).toBeNull();
  });

  it("rejects blocked extensions", () => {
    const blocked = [".exe", ".bat", ".sh", ".dll", ".ps1"];
    for (const ext of blocked) {
      const result = validateUpload(`malware${ext}`, 100, "application/octet-stream");
      expect(result).not.toBeNull();
      expect(result?.code).toBe("extension_blocked");
    }
  });

  it("accepts safe extensions", () => {
    const safe = ["photo.jpg", "doc.pdf", "data.csv", "image.png", "report.docx"];
    for (const filename of safe) {
      const result = validateUpload(filename, 100, "application/octet-stream");
      expect(result).toBeNull();
    }
  });

  it("rejects disallowed MIME types when allowedTypes is specified", () => {
    const result = validateUpload("file.txt", 100, "text/plain", {
      allowedTypes: ["image/jpeg", "image/png"],
    });
    expect(result).not.toBeNull();
    expect(result?.code).toBe("type_not_allowed");
  });

  it("accepts wildcard MIME type categories", () => {
    const result = validateUpload("photo.jpg", 100, "image/jpeg", {
      allowedTypes: ["image/*"],
    });
    expect(result).toBeNull();
  });

  it("rejects non-matching wildcard categories", () => {
    const result = validateUpload("file.txt", 100, "text/plain", {
      allowedTypes: ["image/*"],
    });
    expect(result).not.toBeNull();
    expect(result?.code).toBe("type_not_allowed");
  });

  it("allows all types with */* wildcard", () => {
    const result = validateUpload("anything.xyz", 100, "application/x-custom", {
      allowedTypes: ["*/*"],
    });
    expect(result).toBeNull();
  });
});

describe("validateImageDimensions", () => {
  it("accepts valid dimensions", () => {
    const result = validateImageDimensions({ width: 800, height: 600 });
    expect(result).toBeNull();
  });

  it("rejects zero width", () => {
    const result = validateImageDimensions({ width: 0, height: 600 });
    expect(result).not.toBeNull();
    expect(result?.code).toBe("invalid_image");
  });

  it("rejects negative dimensions", () => {
    const result = validateImageDimensions({ width: -1, height: 600 });
    expect(result).not.toBeNull();
    expect(result?.code).toBe("invalid_image");
  });

  it("rejects dimensions exceeding max", () => {
    const result = validateImageDimensions(
      { width: 5000, height: 3000 },
      { maxWidth: 4096, maxHeight: 4096 },
    );
    expect(result).not.toBeNull();
    expect(result?.code).toBe("invalid_image");
    expect(result?.message).toContain("width");
  });

  it("rejects height exceeding max", () => {
    const result = validateImageDimensions(
      { width: 3000, height: 5000 },
      { maxWidth: 4096, maxHeight: 4096 },
    );
    expect(result).not.toBeNull();
    expect(result?.code).toBe("invalid_image");
    expect(result?.message).toContain("height");
  });

  it("accepts dimensions at exactly the max", () => {
    const result = validateImageDimensions(
      { width: 4096, height: 4096 },
      { maxWidth: 4096, maxHeight: 4096 },
    );
    expect(result).toBeNull();
  });
});

describe("createImageValidationRules", () => {
  it("creates rules with sensible defaults", () => {
    const rules = createImageValidationRules();
    expect(rules.maxSize).toBe(10 * 1024 * 1024);
    expect(rules.allowedTypes).toContain("image/jpeg");
    expect(rules.allowedTypes).toContain("image/png");
    expect(rules.allowedTypes).toContain("image/webp");
    expect(rules.imageDimensions?.maxWidth).toBe(4096);
    expect(rules.imageDimensions?.maxHeight).toBe(4096);
  });

  it("respects custom options", () => {
    const rules = createImageValidationRules({
      maxSize: 5 * 1024 * 1024,
      maxWidth: 2048,
      maxHeight: 2048,
    });
    expect(rules.maxSize).toBe(5 * 1024 * 1024);
    expect(rules.imageDimensions?.maxWidth).toBe(2048);
  });
});

describe("createDocumentValidationRules", () => {
  it("creates rules with sensible defaults", () => {
    const rules = createDocumentValidationRules();
    expect(rules.maxSize).toBe(50 * 1024 * 1024);
    expect(rules.allowedTypes).toContain("application/pdf");
    expect(rules.allowedTypes).toContain("text/csv");
  });

  it("respects custom max size", () => {
    const rules = createDocumentValidationRules({ maxSize: 100 * 1024 * 1024 });
    expect(rules.maxSize).toBe(100 * 1024 * 1024);
  });
});
