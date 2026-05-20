# Token-based invites

**Decision**: Invites use a `/join/:token` flow instead of Supabase magic links sent directly to email.

## Why

Kitchen workers share invite links via WhatsApp/Signal/Telegram — email is optional. The link-based flow works without email: person fills in their own name, email, and password on the join page.

## How it works

- `invites.email` is nullable
- `invites.token` is a UUID, embedded in the link
- `handle_new_user()` trigger matches new auth users to invite by token (from `raw_user_meta_data`)
- Email invite mode still generates a token link, just delivers it via Resend

See [[Invite Flow]].
