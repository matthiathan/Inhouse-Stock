import { describe, expect, it } from 'vitest';
import { normalizeScannedAssetCode } from './qr';

describe('normalizeScannedAssetCode', () => {
  it('trims plain QR codes', () => {
    expect(normalizeScannedAssetCode('  QR-30663  ')).toBe('QR-30663');
  });

  it('extracts QR values from supported URL query keys', () => {
    expect(normalizeScannedAssetCode('https://portal.example/assets?qr_code=ZA-100')).toBe('ZA-100');
    expect(normalizeScannedAssetCode('https://portal.example/scan?asset=ASSET%2042')).toBe('ASSET 42');
  });

  it('falls back to the final URL path segment', () => {
    expect(normalizeScannedAssetCode('https://portal.example/assets/QR-9001')).toBe('QR-9001');
  });

  it('removes a legacy asset prefix from non-URL payloads', () => {
    expect(normalizeScannedAssetCode('asset:30663')).toBe('30663');
  });

  it('handles empty scanner payloads safely', () => {
    expect(normalizeScannedAssetCode(null)).toBe('');
    expect(normalizeScannedAssetCode(undefined)).toBe('');
    expect(normalizeScannedAssetCode('   ')).toBe('');
  });
});
