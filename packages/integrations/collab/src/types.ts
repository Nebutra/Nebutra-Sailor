import type * as Y from "yjs";

/**
 * Pluggable persistence for encoded room state. State is an opaque Yjs
 * update (`Uint8Array`); this layer never interprets it. The tenant+room
 * pair is the partition key — adapters MUST scope reads/writes by it and
 * MUST NOT return one tenant's bytes for another's key.
 */
export interface SnapshotStore {
  load(tenantId: string, roomId: string): Promise<Uint8Array | null>;
  save(tenantId: string, roomId: string, state: Uint8Array): Promise<void>;
}

/**
 * Transport-agnostic fan-out seam. The default is an in-memory loopback;
 * a Pusher / WebSocket adapter implements the same two methods and plugs in
 * via `createCollab({ transport })`. Updates are opaque Yjs update bytes.
 */
export interface CollabTransport {
  broadcast(tenantId: string, roomId: string, update: Uint8Array): void | Promise<void>;
  /** Subscribe to remote updates for one tenant-scoped room; returns unsub. */
  subscribe(tenantId: string, roomId: string, cb: (update: Uint8Array) => void): () => void;
}

export type UpdateListener = (update: Uint8Array, origin: unknown) => void;

export interface CollabConfig {
  store?: SnapshotStore;
  transport?: CollabTransport;
}

export interface CollabRoom {
  readonly tenantId: string;
  readonly roomId: string;
  readonly doc: Y.Doc;
  applyUpdate(update: Uint8Array, origin?: unknown): void;
  encodeState(): Uint8Array;
  onUpdate(cb: UpdateListener): () => void;
  snapshot(): Promise<void>;
  destroy(): void;
}

export interface DoctorCheck {
  readonly ok: boolean;
  readonly detail: string;
}

export interface DoctorReport {
  readonly ok: boolean;
  readonly durationMs: number;
  readonly checks: {
    readonly yjs: DoctorCheck;
    readonly store: DoctorCheck;
    readonly transport: DoctorCheck;
  };
}

export interface CollabHub {
  /** Returns/creates a tenant-scoped CRDT room. Hard-partitioned by tenant. */
  room(tenantId: string, roomId: string): CollabRoom;
  /** Like `room`, but first hydrates from the snapshot store if present. */
  roomRestored(tenantId: string, roomId: string): Promise<CollabRoom>;
  doctor(): Promise<DoctorReport>;
  /** Destroy every live room and release resources. */
  destroy(): void;
}
