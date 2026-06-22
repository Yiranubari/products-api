import { Cursor } from "@/types/product";
import { BadCursorError } from "@/exceptions/bad-cursor";

export function encodeCursor(cursor: Cursor): string {
  const payload = JSON.stringify({
    c: cursor.createdAt.toISOString(),
    i: cursor.id,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeCursor(raw: string): Cursor {
  let parsed: unknown;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    parsed = JSON.parse(json);
  } catch {
    throw new BadCursorError();
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("c" in parsed) ||
    !("i" in parsed)
  ) {
    throw new BadCursorError();
  }

  const { c, i } = parsed as { c: unknown; i: unknown };

  if (typeof c !== "string" || typeof i !== "number") {
    throw new BadCursorError();
  }

  const createdAt = new Date(c);
  if (Number.isNaN(createdAt.getTime())) {
    throw new BadCursorError();
  }

  return { createdAt, id: i };
}
