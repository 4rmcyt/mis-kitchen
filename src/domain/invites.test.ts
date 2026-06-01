import { describe, it, expect } from 'vitest';
import { inviteExpiresAt, buildLinkInvitePayload, buildEmailInvitePayload } from './invites.js';

describe('inviteExpiresAt', () => {
  it('returns timestamp 48h from provided now', () => {
    const now = new Date('2026-06-01T00:00:00Z').getTime();
    expect(inviteExpiresAt(now)).toBe('2026-06-03T00:00:00.000Z');
  });
});

describe('buildLinkInvitePayload', () => {
  const base = {
    restaurantId: 'rest-1',
    invitedBy: 'user-1',
    role: 'cook' as const,
    station: 'Grill' as const,
    token: 'tok-abc',
    now: new Date('2026-06-01T00:00:00Z').getTime(),
  };

  it('builds correct payload', () => {
    expect(buildLinkInvitePayload(base)).toEqual({
      restaurant_id: 'rest-1',
      invited_by: 'user-1',
      email: null,
      role: 'cook',
      station: 'Grill',
      token: 'tok-abc',
      used: false,
      expires_at: '2026-06-03T00:00:00.000Z',
    });
  });
});

describe('buildEmailInvitePayload', () => {
  it('trims email and maps fields', () => {
    const result = buildEmailInvitePayload({
      email: '  chef@example.com  ',
      role: 'admin',
      station: 'Rolls',
      restaurantId: 'rest-1',
      invitedBy: 'user-1',
      invitedByName: 'Manager',
    });
    expect(result.email).toBe('chef@example.com');
    expect(result.invited_by_name).toBe('Manager');
    expect(result.role).toBe('admin');
  });
});
