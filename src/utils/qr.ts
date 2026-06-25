const ASSET_QUERY_KEYS = ['qr', 'qr_code', 'qrcode', 'asset', 'asset_code', 'code'];

export const normalizeScannedAssetCode = (rawValue: string | null | undefined): string => {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);

    for (const key of ASSET_QUERY_KEYS) {
      const value = url.searchParams.get(key);
      if (value) return decodeURIComponent(value).trim();
    }

    const meaningfulSegment = url.pathname
      .split('/')
      .filter(Boolean)
      .pop();

    if (meaningfulSegment) {
      return decodeURIComponent(meaningfulSegment).trim();
    }
  } catch {
    // Not a URL; fall through to plain-code handling.
  }

  return trimmed.replace(/^asset:/i, '').trim();
};
