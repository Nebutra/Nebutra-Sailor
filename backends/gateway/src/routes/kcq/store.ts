/** Tenant-scoped durable credentials. Secrets are only decrypted for consumption. */
import { getTenantDb } from "@nebutra/db";
import { decryptJSON, encryptJSON, isEncryptedSecret } from "@nebutra/vault";
import { z } from "zod";
import { MarketSourceError } from "./twelve-data.js";

export interface ConnectionMetadata {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  updatedAt: string;
}
export interface ConnectionStore {
  list(tenantId: string): Promise<ConnectionMetadata[]>;
  find(tenantId: string, id: string): Promise<(ConnectionMetadata & { key: string }) | null>;
  save(
    tenantId: string,
    input: { id?: string | undefined; label: string; apiKey: string },
  ): Promise<ConnectionMetadata>;
  remove(tenantId: string, id: string): Promise<boolean>;
}
const publicSelect = { id: true, provider: true, label: true, maskedKey: true, updatedAt: true };
function metadata(row: {
  id: string;
  provider: string;
  label: string;
  maskedKey: string;
  updatedAt: Date;
}): ConnectionMetadata {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}
export const connectionStore: ConnectionStore = {
  async list(tenantId) {
    return (
      await getTenantDb(tenantId).marketDataConnection.findMany({
        where: { tenantId },
        select: publicSelect,
        orderBy: { createdAt: "asc" },
      })
    ).map(metadata);
  },
  async find(tenantId, id) {
    const row = await getTenantDb(tenantId).marketDataConnection.findFirst({
      where: { id, tenantId },
    });
    if (!row) return null;
    if (!isEncryptedSecret(row.credentials))
      throw new MarketSourceError(503, "凭据保护不可用，请联系管理员。");
    const plain: unknown = await decryptJSON(row.credentials, { context: { tenantId } });
    const credentials = z
      .object({ apiKey: z.string().min(1), connectionId: z.string() })
      .parse(plain);
    if (credentials.connectionId !== id) throw new MarketSourceError(503, "凭据绑定验证失败。");
    return {
      ...metadata({
        id: row.id,
        provider: row.provider,
        label: row.label,
        maskedKey: row.maskedKey,
        updatedAt: row.updatedAt,
      }),
      key: credentials.apiKey,
    };
  },
  async save(tenantId, input) {
    const db = getTenantDb(tenantId);
    const id = input.id ?? crypto.randomUUID();
    if (
      input.id &&
      !(await db.marketDataConnection.findFirst({ where: { id, tenantId }, select: { id: true } }))
    )
      throw new MarketSourceError(404, "连接不存在。");
    if (!input.id && (await db.marketDataConnection.count({ where: { tenantId } })) >= 10)
      throw new MarketSourceError(400, "每个工作区最多连接 10 个行情源。");
    const envelope = await encryptJSON(
      { apiKey: input.apiKey, connectionId: id },
      { id, context: { tenantId, kind: "kcq-market-data" } },
    );
    const data = {
      label: input.label,
      credentials: { ...envelope },
      maskedKey: `••••${input.apiKey.slice(-4)}`,
    };
    if (input.id) {
      const result = await db.marketDataConnection.updateMany({ where: { id, tenantId }, data });
      if (!result.count) throw new MarketSourceError(404, "连接不存在。");
      const row = await db.marketDataConnection.findFirstOrThrow({
        where: { id, tenantId },
        select: publicSelect,
      });
      return metadata(row);
    }
    return metadata(
      await db.marketDataConnection.create({
        data: { id, tenantId, provider: "twelvedata", ...data },
        select: publicSelect,
      }),
    );
  },
  async remove(tenantId, id) {
    return (
      (await getTenantDb(tenantId).marketDataConnection.deleteMany({ where: { id, tenantId } }))
        .count > 0
    );
  },
};
