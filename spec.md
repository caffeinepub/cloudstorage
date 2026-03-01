# Specification

## Summary
**Goal:** Reorganize the Admin Dashboard by introducing three tabs (User Management, Storage Management, Recent Activity) below the existing stat cards, replacing the current stacked layout.

**Planned changes:**
- Remove the stacked User Storage Management and Recent Activity panels from the main non-tabbed view in `AdminDashboard.tsx`
- Add three tabs below the stat cards: **User Management**, **Storage Management**, and **Recent Activity**
- **User Management tab**: contains Pending Registrations section (approve/reject) and All Registrations table (Principal ID, Name, Role, Status, Actions); Reject button hidden for the admin's own row
- **Storage Management tab**: displays User Storage Management table (User, Used, Quota) with an editable numeric input per row pre-filled with the current quota (default 953.67 MB); saving calls the backend to persist the new quota
- **Recent Activity tab**: shows only login activity entries (user identifier + timestamp); fetched via a new admin-only backend query; displays loading and empty states
- Backend: record a login activity entry in the ActivityLog on successful user authentication; add an admin-only query to retrieve all login activity entries

**User-visible outcome:** Admins see a cleaner dashboard where user management, storage quota editing, and login activity are each in their own tab, and login events are tracked and displayed in the Recent Activity tab.
