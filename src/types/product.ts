import { Product } from "@prisma/client";

export type Direction = "next" | "prev";

export interface Cursor {
  createdAt: Date;
  id: number;
}

export interface ListParams {
  limit: number;
  category?: string;
  cursor?: Cursor;
  direction: Direction;
}

export interface ListResult {
  data: Product[];
  nextCursor: Cursor | null;
  prevCursor: Cursor | null;
  hasNext: boolean;
  hasPrev: boolean;
}
