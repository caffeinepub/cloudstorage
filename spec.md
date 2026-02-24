# Specification

## Summary
**Goal:** Add client-side pagination to the My Files, Shared, Trash, and Recent sections of the CloudStorage app.

**Planned changes:**
- Create a reusable Pagination component with an items-per-page dropdown (options: 10, 25, 50, 100; default: 10, never persisted), page number buttons, Previous/Next buttons, First/Last buttons, a total items/pages display, and a current range indicator (e.g., "Showing 21–40 of 356 items")
- Apply the Pagination component to the My Files section (Dashboard/FileList), paginating all file and folder entries
- Apply the Pagination component to the Shared section, with independent pagination state for the Shared With Me and Shared By Me sub-sections
- Apply the Pagination component to the Trash section, with independent pagination state for the Files and Folders tabs
- Apply the Pagination component to the Recent section, paginating all recent file entries
- Changing items-per-page resets to page 1 in all sections; pagination state is never saved to localStorage or sessionStorage

**User-visible outcome:** Users see paginated lists in My Files, Shared, Trash, and Recent sections, with controls to navigate pages and select how many items to display per page, resetting to 10 items per page on every load.
