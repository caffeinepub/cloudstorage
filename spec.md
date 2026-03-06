# CloudStorage

## Current State

- Approval-based registration: new users call `requestApproval()` which adds them to `approvalState.approvalStatus` (the user-approval module's map). They are stuck on WaitingApproval until the admin approves them.
- `listApprovals` is a `query` function that calls `AccessControl.hasPermission(accessControlState, caller, #admin)` before returning data.
- `AccessControl.hasPermission` → `getUserRole` → `Runtime.trap("User is not registered")` if the caller is not present in `accessControlState.userRoles`.
- `_initializeAccessControlWithSecret` registers the admin in `accessControlState.userRoles`, but if it hasn't run yet (e.g. fresh canister), `listApprovals` traps and the frontend silently catches the error and returns `[]`.
- `getRegisteredUsersWithQuota` iterates over `userProfiles` (only populated by `saveCallerUserProfile`). Pending users never reach ProfileSetup (they're on WaitingApproval), so they never appear in `userProfiles` → Storage Management shows no users or fails.
- `WaitingApproval.tsx` auto-calls `requestApproval()` but does NOT collect or save name/email — so pending users have no profile data visible in admin.

## Requested Changes (Diff)

### Add
- A new backend function `requestApprovalWithProfile(name: Text, email: Text)` that calls `UserApproval.requestApproval` AND stores the user's name/email in `userProfiles` atomically.
- WaitingApproval page updated to collect name and email from the user before submitting the approval request (simple form shown before auto-submit).

### Modify
- `listApprovals` backend function: replace `AccessControl.hasPermission` trap with a safe check (`isAdmin`) that returns false instead of trapping for unregistered callers. Use `shared` instead of `query` so it works correctly even when called after the init update.
- `getRegisteredUsersWithQuota`: merge data from both `userProfiles` AND `approvalState.approvalStatus` so all principals who registered (even pending ones) appear in the list. For principals without a profile, show 0 used / default quota.
- `useListApprovals` in useQueries.ts: propagate errors instead of silently swallowing them (add better error handling/logging).
- `WaitingApproval.tsx`: show a name/email form for first-time visitors; on submit call `requestApprovalWithProfile`; on subsequent loads (already requested) skip the form.

### Remove
- Nothing removed

## Implementation Plan

1. Backend (`main.mo`):
   - Add `requestApprovalWithProfile(name: Text, email: Text)` public shared function
   - Make `listApprovals` a `shared` (update) call instead of `query`, or keep it `query` but use a safe admin check that doesn't trap unregistered callers
   - Fix `getRegisteredUsersWithQuota` to union `userProfiles` and `approvalState.approvalStatus` principals

2. Frontend:
   - Add `useRequestApprovalWithProfile` hook in useQueries.ts
   - Update `WaitingApproval.tsx` to show a name/email form; submit using `requestApprovalWithProfile`; detect if already pending (localStorage flag) to skip the form
