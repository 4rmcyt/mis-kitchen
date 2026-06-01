import type { Role, Station } from '../lib/types.js';

export interface InvitePayload {
  restaurant_id: string;
  invited_by: string;
  email: null;
  role: Role;
  station: Station;
  token: string;
  used: false;
  expires_at: string;
}

export interface EmailInvitePayload {
  email: string;
  role: Role;
  station: Station;
  restaurant_id: string;
  invited_by: string;
  invited_by_name: string;
}

/** Returns ISO timestamp 48 hours from now. */
export function inviteExpiresAt(now = Date.now()): string {
  return new Date(now + 48 * 60 * 60 * 1000).toISOString();
}

/** Build the DB row for a link-based invite. */
export function buildLinkInvitePayload(params: {
  restaurantId: string;
  invitedBy: string;
  role: Role;
  station: Station;
  token: string;
  now?: number;
}): InvitePayload {
  return {
    restaurant_id: params.restaurantId,
    invited_by: params.invitedBy,
    email: null,
    role: params.role,
    station: params.station,
    token: params.token,
    used: false,
    expires_at: inviteExpiresAt(params.now),
  };
}

/** Build the payload for an email invite (sent via Edge Function). */
export function buildEmailInvitePayload(params: {
  email: string;
  role: Role;
  station: Station;
  restaurantId: string;
  invitedBy: string;
  invitedByName: string;
}): EmailInvitePayload {
  return {
    email: params.email.trim(),
    role: params.role,
    station: params.station,
    restaurant_id: params.restaurantId,
    invited_by: params.invitedBy,
    invited_by_name: params.invitedByName,
  };
}
