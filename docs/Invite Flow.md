# Invite Flow

Two invite modes, both generate a `/join/:token` link.

## Mode 1: Generate Link

Admin creates an invite record with `email = null`. Share link via WhatsApp, Signal, etc.

```
Admin clicks "+ Invite" → selects role/station → "Generate Link"
  → INSERT into invites (token=uuid, email=null)
  → show /join/<token> link to copy
```

## Mode 2: Invite by Email

Admin enters email. Edge function creates invite + sends email via Resend.

```
Admin clicks "+ Invite" → selects "Invite by Email" → enters email → "Send Invite"
  → supabase.functions.invoke('send-invite', { email, role, station, ... })
    → INSERT into invites
    → supabase.auth.admin.generateLink({ type: 'invite', email })
    → Resend email with "Accept Invite" button → /join/<token>
  → toast "Invite sent!" shown for 1.5s, modal closes
```

## Onboarding Flow

User opens `/join/:token`:

```
/join/:token page loads
  → shows form: name, email, password, confirm password
  → user submits
    → POST to accept-invite edge function
      → validate token (used=false, not expired)
      → if invite.email set: verify submitted email matches (case-insensitive)
      → supabase.auth.admin.createUser({ email, password, email_confirm: true,
          user_metadata: { name, role, station, invite_token: token } })
        → handle_new_user() trigger fires:
            - finds invite via invite_token in user_metadata (or email for email invites)
            - INSERT into profiles (id, restaurant_id, name, email, role, station)
            - UPDATE invites SET used = true
        → on createUser failure: reject with error (invite remains unused for retry)
      → upsert profile (password_set=true, name override in case trigger had stale data)
      → return { ok: true }
    → JoinPage calls supabase.auth.signInWithPassword({ email, password })
    → navigate('/') → Today screen
```

## Security

The `handle_new_user` trigger atomically marks the invite used at the same time as
the auth user is created (both happen inside the same DB transaction). This prevents
replay attacks — a second `createUser` call with the same token will fail because the
trigger will find no matching `used=false` invite.

If `createUser` fails (e.g. email already registered), the function rejects outright.
The invite is NOT rolled back so the admin can re-invite with a different email.

## E2E Test Coverage

- `e2e/features/invite_onboarding.feature`
  - Admin can generate an invite link
  - Admin can send invite by email
  - Invited user completes onboarding via link

## Related

- [[Architecture]]
- [[Database]]
- [[E2E Testing]]
