export interface CursorPayload {
  v: 1;
  sort: string;
  t: string;
  id: string;
  t0?: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(raw: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8')
    ) as Partial<CursorPayload>;

    if (
      parsed.v !== 1 ||
      typeof parsed.sort !== 'string' ||
      typeof parsed.t !== 'string' ||
      typeof parsed.id !== 'string' ||
      (parsed.t0 !== undefined && typeof parsed.t0 !== 'string')
    ) {
      return null;
    }

    return parsed as CursorPayload;
  } catch {
    return null;
  }
}
