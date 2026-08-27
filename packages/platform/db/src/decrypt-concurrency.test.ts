import { describe, expect, it } from "vitest";
import { DATABASE_DECRYPT_CONCURRENCY, decryptRecordsWithLimit } from "./decrypt-concurrency";

describe("decryptRecordsWithLimit", () => {
  it("caps record decryption fan-out", async () => {
    let active = 0;
    let maxActive = 0;
    const processed: number[] = [];
    const records = Array.from({ length: DATABASE_DECRYPT_CONCURRENCY + 4 }, (_, index) => ({
      index,
    }));

    await decryptRecordsWithLimit(records, async (record) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      processed.push(record.index);
      active -= 1;
    });

    expect(maxActive).toBeLessThanOrEqual(DATABASE_DECRYPT_CONCURRENCY);
    expect(processed).toHaveLength(records.length);
  });
});
