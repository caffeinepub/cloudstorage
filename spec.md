# Specification

## Summary
**Goal:** Fix the Grid & List view toggle in the My Files (Dashboard/FileList) section so that clicking the view icons actually switches the file display layout.

**Planned changes:**
- Initialize and manage `viewMode` state correctly in the parent component (Dashboard or FileList)
- Pass `viewMode` state and its setter down to the `FileToolbar` component
- Update the file rendering logic to apply grid or list layout based on the current `viewMode`
- Visually highlight the active view icon in `FileToolbar` to reflect the current mode

**User-visible outcome:** Users can click the grid or list view icon in the My Files section and the file display area will switch between a multi-column grid layout and a single-column list layout, with the active icon visually highlighted.
