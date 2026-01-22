import { describe, it, expect } from 'vitest';
import { compareIdsNaturally } from '../../src/client/utils/sortUtils';

describe('compareIdsNaturally', () => {
  it('sorts numeric suffixes correctly', () => {
    const ids = ['xqkm.10', 'xqkm.2', 'xqkm.3', 'xqkm.1', 'xqkm.20'];
    const sorted = ids.sort(compareIdsNaturally);
    expect(sorted).toEqual(['xqkm.1', 'xqkm.2', 'xqkm.3', 'xqkm.10', 'xqkm.20']);
  });

  it('sorts mixed numbers including single and double digits', () => {
    const ids = ['xqkm.19', 'xqkm.2', 'xqkm.20', 'xqkm.3', 'xqkm.23'];
    const sorted = ids.sort(compareIdsNaturally);
    expect(sorted).toEqual(['xqkm.2', 'xqkm.3', 'xqkm.19', 'xqkm.20', 'xqkm.23']);
  });

  it('sorts different prefixes correctly', () => {
    const ids = ['beta.5', 'alpha.10', 'alpha.2', 'beta.1'];
    const sorted = ids.sort(compareIdsNaturally);
    expect(sorted).toEqual(['alpha.2', 'alpha.10', 'beta.1', 'beta.5']);
  });

  it('handles IDs without dots', () => {
    const ids = ['abc', 'xyz', 'def'];
    const sorted = ids.sort(compareIdsNaturally);
    expect(sorted).toEqual(['abc', 'def', 'xyz']);
  });

  it('handles IDs with non-numeric suffixes', () => {
    const ids = ['proj.abc', 'proj.xyz', 'proj.5'];
    const sorted = ids.sort(compareIdsNaturally);
    // Non-numeric suffix treated as 0, so proj.abc and proj.xyz come before proj.5 based on prefix then numeric
    expect(sorted).toEqual(['proj.abc', 'proj.xyz', 'proj.5']);
  });

  it('handles beads-style IDs with project prefix', () => {
    const ids = [
      'beads-dashboard-abc.10',
      'beads-dashboard-abc.2',
      'beads-dashboard-abc.23',
      'beads-dashboard-abc.3'
    ];
    const sorted = ids.sort(compareIdsNaturally);
    expect(sorted).toEqual([
      'beads-dashboard-abc.2',
      'beads-dashboard-abc.3',
      'beads-dashboard-abc.10',
      'beads-dashboard-abc.23'
    ]);
  });
});
