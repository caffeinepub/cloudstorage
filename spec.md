# Specification

## Summary
**Goal:** Add five bulk action icon buttons to the Selection Bulk Action bar in FileList.tsx that only appear when 2 or more files are selected.

**Planned changes:**
- Add five new icon buttons (Download All, Favorites All, Shared All, Move All, Delete All) to the bulk action bar, placed immediately after the "Deselect All" button
- Hide all five buttons when only 1 file is selected; show them only when 2+ files are selected
- Implement Download All: trigger individual file downloads for all selected files, with a toast confirmation
- Implement Favorites All: add all selected files to Favorites using the existing favorites mutation hook, with a toast notification
- Implement Shared All: trigger the share flow for all selected files using existing share mutation hooks, opening a minimal dialog if share details are required
- Implement Move All: open the existing folder selection dialog and move all selected files to the chosen destination using the existing move mutation
- Implement Delete All: open a confirmation dialog showing the number of files to be deleted, then delete all selected files using the existing delete mutation, clear selection afterward
- All operations reuse existing mutation hooks from useQueries.ts and show success/error toast notifications

**User-visible outcome:** When 2 or more files are selected, users see five additional bulk action buttons in the selection bar, allowing them to download, favorite, share, move, or delete all selected files at once in a single action.
