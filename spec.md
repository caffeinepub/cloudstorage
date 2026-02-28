# Specification

## Summary
**Goal:** Add a user registration approval system with status-based access control and a SuperAdmin panel to the CloudStorage Access Control app.

**Planned changes:**
- Add a `status` field to each registered principal in the backend with possible values: `SuperAdmin`, `Active`, `Pending`, `Rejected`, `Suspended`
- Automatically assign `SuperAdmin` status to the very first user who logs in; all subsequent new users receive `Pending` status
- Expose backend queries for a user to retrieve their own status, and for SuperAdmin to list all users with statuses
- Expose backend update calls for SuperAdmin to approve (set `Active`) or reject (set `Rejected`) pending users
- After login, route users to a full-screen waiting screen if `Pending`, a full-screen rejection screen if `Rejected`, or normal app flow if `Active` or `SuperAdmin`
- Add an Admin Panel page accessible only to SuperAdmin, showing a table of all registered users (principal ID, display name, status badge) with Approve/Reject action buttons for each `Pending` user
- Redirect non-SuperAdmin users who navigate to the Admin Panel URL to an Access Denied message

**User-visible outcome:** After logging in, new users see a pending approval screen instead of the app. The SuperAdmin can visit the Admin Panel to view all registered users and approve or reject pending accounts, immediately granting or denying access.
