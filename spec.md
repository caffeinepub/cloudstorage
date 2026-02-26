# Specification

## Summary
**Goal:** Add a "Rename" action to both the bulk selection action bar and the three-dot context menu in the My Files section of CloudVault.

**Planned changes:**
- Add a "Rename" button with a rename/edit icon to the bulk action bar, positioned between "Download" and "Move" (order: Download, Rename, Move, Delete)
- Add a "Rename" menu item with a rename/edit icon to the three-dot context menu for each file/folder row, positioned between "Preview" and "Move" (order: Preview, Rename, Move, Delete)
- Clicking "Rename" in the bulk action bar opens the rename dialog when one item is selected
- Clicking "Rename" in the three-dot menu opens the rename dialog pre-filled with the current file or folder name
- On successful rename, update the item name in the list and show a success toast; show an error toast on failure
- Reuse existing RenameFileDialog / RenameFolderDialog components

**User-visible outcome:** Users can rename files and folders directly from the bulk action bar and the three-dot context menu in My Files, without needing to navigate elsewhere.
