import { applyStatusTabToSearchParams, parseStatus } from './statusTabParams';

describe('parseStatus', () => {
  it('returns null when status is absent', () => {
    expect(parseStatus(null)).toBeNull();
  });

  it('returns null for empty or invalid values', () => {
    expect(parseStatus('')).toBeNull();
    expect(parseStatus('all')).toBeNull();
    expect(parseStatus('draft')).toBeNull();
  });

  it('accepts submitted, approved, rejected', () => {
    expect(parseStatus('submitted')).toBe('submitted');
    expect(parseStatus('approved')).toBe('approved');
    expect(parseStatus('rejected')).toBe('rejected');
  });
});

describe('applyStatusTabToSearchParams', () => {
  it('sets status=rejected when selecting Reattempt from no status', () => {
    const current = new URLSearchParams('college=ABC&email=test@example.com');
    const next = applyStatusTabToSearchParams(current, null, 'rejected');
    expect(next.get('status')).toBe('rejected');
    expect(next.get('college')).toBe('ABC');
    expect(next.get('email')).toBe('test@example.com');
    expect(next.get('page')).toBeNull();
  });

  it('removes status when clicking the active Reattempt tab again', () => {
    const current = new URLSearchParams(
      'college=ABC&email=test@example.com&status=rejected&page=2',
    );
    const next = applyStatusTabToSearchParams(current, 'rejected', 'rejected');
    expect(next.get('status')).toBeNull();
    expect(next.get('page')).toBeNull();
    expect(next.get('college')).toBe('ABC');
    expect(next.get('email')).toBe('test@example.com');
  });

  it('switches from rejected to approved and resets page', () => {
    const current = new URLSearchParams('college=ABC&status=rejected&page=2');
    const next = applyStatusTabToSearchParams(current, 'rejected', 'approved');
    expect(next.get('status')).toBe('approved');
    expect(next.get('page')).toBeNull();
    expect(next.get('college')).toBe('ABC');
  });
});
