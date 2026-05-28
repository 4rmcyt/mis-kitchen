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
      → validate token (not used, not expired)
      → if invite.email set: verify submitted email matches
      → UPDATE invites SET used = true (atomic, before createUser — prevents replay)
      → supabase.auth.admin.createUser({ email, password, email_confirm: true,
          user_metadata: { name, role, station, invite_token: token } })
        → on createUser failure (non-"already exists"): rollback used = false
        → handle_new_user() trigger fires → INSERT into profiles
      → upsert profile (name, password_set=true, role, station, restaurant_id)
      → return { ok: true }
    → JoinPage calls supabase.auth.signInWithPassword({ email, password })
    → navigate('/') → Today screen
```

## E2E Test Coverage

- `e2e/features/invite_onboarding.feature`
  - Admin can generate an invite link
  - Admin can send invite by email
  - Invited user completes onboarding via link

## Related

- [[Architecture]]
- [[Database]]
- [[E2E Testing]]
