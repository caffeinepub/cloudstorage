# Specification

## Summary
**Goal:** Build a complete folder management system with nested folders, folder navigation, and proper file isolation within folders.

**Planned changes:**
- Implement backend folder hierarchy with unlimited nesting depth using parent-child relationships via folderId field
- Add backend query method to retrieve folder path from root to current folder for breadcrumb display
- Implement folder navigation state management in frontend, allowing users to click folders to navigate into them
- Add breadcrumb navigation component showing full folder path with clickable links to ancestor folders
- Add back button that navigates to the parent folder
- Ensure file uploads work within any folder by passing current folderId to upload operation
- Isolate files to their specific folder location, only showing files when that folder is actively selected
- Fix folder creation in My Folder section to immediately display newly created folders without page refresh
- Maintain separate independent storage areas for My Files section (root-level files) and My Folder section (organized folder hierarchy)

**User-visible outcome:** Users can create nested folders within folders, navigate into folders by clicking them, see breadcrumb navigation showing their current path, use a back button to go to parent folders, upload files directly into any folder, and see files isolated to their specific folder locations. The My Files and My Folder sections remain completely separate and independent.
