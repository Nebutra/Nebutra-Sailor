/**
 * Scene model for the creative canvas.
 *
 * A narrow, transport-stable subset of the Excalidraw element shape — enough
 * to place agent-generated media deterministically on the server without
 * pulling Excalidraw as a server dependency. The browser holds the full
 * Excalidraw scene; the server is authoritative only for *placement* and
 * *persistence*, exactly the property that makes refresh == realtime.
 */

export type CanvasElementType = "image" | "embeddable" | "text";

export interface CanvasElement {
  readonly id: string;
  readonly type: CanvasElementType;
  /** Top-left x in scene coordinates. */
  readonly x: number;
  /** Top-left y in scene coordinates. */
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /**
   * For `image` — a file id resolvable in `scene.files`.
   * For `embeddable` — the media URL (video).
   * For `text` — the literal string.
   */
  readonly ref: string;
  /** Free-form, provider/agent attribution (prompt, model, etc.). */
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface CanvasFile {
  readonly id: string;
  readonly mimeType: string;
  /** `data:` URI or remote URL. */
  readonly dataURL: string;
}

export interface CanvasScene {
  readonly elements: readonly CanvasElement[];
  readonly files: readonly CanvasFile[];
}

export interface AtelierCanvas {
  readonly id: string;
  /** Owning organization — every read/write is scoped by this. */
  readonly tenantId: string;
  readonly name: string;
  readonly scene: CanvasScene;
  /** Latest generated asset, for list/grid previews. */
  readonly thumbnail?: string;
  readonly updatedAt: Date;
}

/** Size of an element to be placed. */
export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

/** Resolved top-left position in scene coordinates. */
export interface Placement {
  readonly x: number;
  readonly y: number;
}

/**
 * The minimal patch produced by a server-side placement. Persisted *before*
 * it is broadcast, so the websocket message is a pure UI optimization: a
 * client that missed it recovers the identical state on reload.
 */
export interface ScenePatch {
  readonly canvasId: string;
  readonly tenantId: string;
  readonly element: CanvasElement;
  readonly file?: CanvasFile;
  readonly thumbnail?: string;
}

/** Tenant-scoped persistence boundary (repository pattern). */
export interface CanvasStore {
  get(tenantId: string, canvasId: string): Promise<AtelierCanvas | null>;
  create(tenantId: string, canvasId: string, name: string): Promise<AtelierCanvas>;
  /** Replace the persisted scene + thumbnail for a canvas. */
  save(
    tenantId: string,
    canvasId: string,
    scene: CanvasScene,
    thumbnail?: string,
  ): Promise<AtelierCanvas>;
  list(tenantId: string): Promise<readonly AtelierCanvas[]>;
}
