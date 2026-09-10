import type {
  ParaAsset,
  ParaAssetOrigin,
  ParaAssetScope,
  ParaAssetType,
  PrismaClient,
} from "@nebutra/db";
import { getTenantDb } from "@nebutra/db";

export interface CreateParaAssetData {
  type: ParaAssetType;
  origin: ParaAssetOrigin;
  url: string;
  label: string;
  aspect?: string;
  scope?: ParaAssetScope;
  jobId?: string;
  workspaceId?: string;
  projectId?: string;
}

export interface ListParaAssetsParams {
  origin?: ParaAssetOrigin;
  workspaceId?: string;
  projectId?: string;
  limit?: number;
}

/** Account-scoped asset records (upload | generated). Bytes live in object storage via @nebutra/uploads. */
export class ParaAssetRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  list(params: ListParaAssetsParams = {}): Promise<ParaAsset[]> {
    return this.prisma.paraAsset.findMany({
      where: {
        tenantId: this.tenantId,
        ...(params.origin ? { origin: params.origin } : {}),
        ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
        ...(params.projectId ? { projectId: params.projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(params.limit ?? 100, 500),
    });
  }

  find(id: string): Promise<ParaAsset | null> {
    return this.prisma.paraAsset.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  create(data: CreateParaAssetData): Promise<ParaAsset> {
    return this.prisma.paraAsset.create({
      data: {
        tenantId: this.tenantId,
        type: data.type,
        origin: data.origin,
        url: data.url,
        label: data.label,
        ...(data.aspect ? { aspect: data.aspect } : {}),
        ...(data.scope ? { scope: data.scope } : {}),
        ...(data.jobId ? { jobId: data.jobId } : {}),
        ...(data.workspaceId ? { workspaceId: data.workspaceId } : {}),
        ...(data.projectId ? { projectId: data.projectId } : {}),
      },
    });
  }

  setFavorite(id: string, favorite: boolean): Promise<number> {
    return this.prisma.paraAsset
      .updateMany({ where: { id, tenantId: this.tenantId }, data: { favorite } })
      .then((r) => r.count);
  }
}

export function getParaAssetRepository(tenantId: string): ParaAssetRepository {
  return new ParaAssetRepository(getTenantDb(tenantId), tenantId);
}
