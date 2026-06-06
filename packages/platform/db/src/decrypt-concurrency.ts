import pLimit from "p-limit";

export const DATABASE_DECRYPT_CONCURRENCY = 8;

export async function decryptRecordsWithLimit<T>(
  records: readonly T[],
  decryptRecord: (record: T) => Promise<void>,
): Promise<void> {
  const limit = pLimit(DATABASE_DECRYPT_CONCURRENCY);
  await Promise.all(records.map((record) => limit(() => decryptRecord(record))));
}
