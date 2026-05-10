export interface CursorPaginationParams {
  cursor?: string; // ID of the last item from previous page (exclusive)
  limit?: number; // items per page, default 20, max 100
}

export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null; // null means no more pages
  hasNextPage: boolean;
}

export function normalizePaginationParams(params: CursorPaginationParams): {
  cursor: string | undefined;
  take: number;
} {
  return {
    cursor: params.cursor,
    take: Math.min(params.limit ?? 20, 100),
  };
}
