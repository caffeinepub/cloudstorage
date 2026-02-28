# Specification

## Summary
**Goal:** Hardcode a specific principal as the permanent admin, bypassing the approval flow entirely in both backend and frontend.

**Planned changes:**
- In the backend, define `mgyr5-y3u63-q5gfr-gvkv7-etmf3-nz3hc-uxmc2-7glom-54ilt-kpuzm-vae` as a hardcoded admin constant so that `isAdmin` always returns `true` for this principal and it is never subject to any approval state checks.
- In the frontend (`App.tsx`), update post-login routing so that when the authenticated principal matches the hardcoded admin ID, the user is immediately directed to the admin dashboard and never shown the `PendingApprovalPage` or `RejectedPage`.

**User-visible outcome:** Logging in with the admin principal no longer shows the "Account Pending Approval" screen — the admin is routed directly to the admin dashboard. All other users continue through the normal approval flow.
