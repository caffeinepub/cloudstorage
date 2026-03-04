import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Blob "mo:core/Blob";
import Time "mo:core/Time";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

// No explicit migration needed!
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let approvalState = UserApproval.initState(accessControlState);

  type RetentionPeriod = Nat;
  type DefaultRetentionPeriod = Nat;

  public type NotificationType = {
    #storageWarning : {
      usedStorage : Nat;
      totalStorage : Nat;
      thresholdPercentage : Nat;
    };
    #systemAnnouncement : {
      title : Text;
      content : Text;
      isUrgent : Bool;
    };
    #shareNotification : {
      fileId : Text;
      fileName : Text;
      owner : Principal;
      message : Text;
    };
    #activityAlert : {
      fileId : Text;
      fileName : Text;
      activityType : Text;
      timestamp : Nat;
    };
  };

  public type Notification = {
    id : Nat;
    timestamp : Nat;
    notificationType : NotificationType;
    isRead : Bool;
    toUser : Principal;
  };

  public type RecentActivity = {
    timestamp : Nat;
    user : Principal;
    action : Text;
    fileId : Text;
    fileName : Text;
    details : Text;
    relativeTime : Text;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
  };

  public type FileMetadata = {
    id : Text;
    name : Text;
    size : Nat;
    owner : Principal;
    uploadedAt : Nat;
    folderId : ?Text;
  };

  public type ActivityLog = {
    timestamp : Nat;
    user : Principal;
    action : Text;
    fileId : Text;
    fileName : Text;
    details : Text;
  };

  public type TrashMetadata = {
    fileId : Text;
    metadata : FileMetadata;
    deletedAt : Nat;
    originalPath : Text;
    retentionPeriod : RetentionPeriod;
  };

  public type FileBlobEntry = {
    blobs : [(Nat, Blob)];
    metadata : FileMetadata;
  };

  public type FileShare = {
    fileId : Text;
    owner : Principal;
    sharedWith : Principal;
    permissions : SharePermissions;
    sharedAt : Nat;
    message : Text;
  };

  public type SharedFileInfo = {
    fileId : Text;
    sharedWith : Principal;
    permissions : SharePermissions;
    sharedAt : Nat;
    message : Text;
    fileName : Text;
    owner : Principal;
    ownerName : Text;
    ownerEmail : Text;
  };

  public type FavoriteFileInfo = {
    fileId : Text;
    owner : Principal;
    fileName : Text;
    size : Nat;
    addedAt : Nat;
    metadata : ?FileMetadata;
  };

  type SharePermissions = {
    canView : Bool;
    canEdit : Bool;
    canDownload : Bool;
  };

  public type AccessPattern = {
    fileId : Text;
    accessCount : Nat;
    lastAccessed : Nat;
  };

  public type AccessedFileInfo = {
    fileId : Text;
    fileName : Text;
    accessCount : Nat;
    lastAccessed : Nat;
    relativeTime : Text;
    owner : Principal;
    metadata : ?FileMetadata;
  };

  public type SmartSuggestion = {
    fileId : Text;
    fileName : Text;
    reason : Text;
    accessCount : Nat;
    lastAccessed : Nat;
    relativeTime : Text;
  };

  public type Folder = {
    id : Text;
    name : Text;
    owner : Principal;
    parentId : ?Text;
    createdAt : Nat;
  };

  public type FolderProtection = {
    hashedPassword : ?Text;
    isLocked : Bool;
    failedAttempts : Nat;
  };

  type TrashFolderMetadata = {
    folder : Folder;
    deletedAt : Nat;
    originalPath : Text;
    retentionPeriod : RetentionPeriod;
    owner : Principal;
  };

  // Default quota is 1 GB (1,073,741,824 bytes) as per the implementation plan
  let DEFAULT_QUOTA : Nat = 1_073_741_824;
  let ADMIN_QUOTA : Nat = 1_073_741_824;
  let DEFAULT_RETENTION_PERIOD : DefaultRetentionPeriod = 1000000000 * 60 * 60 * 24 * 30;

  let userProfiles = Map.empty<Principal, UserProfile>();
  let userStorageUsed = Map.empty<Principal, Nat>();
  let fileMetadata = Map.empty<Text, FileMetadata>();
  let fileChunks = Map.empty<Text, FileBlobEntry>();
  let userQuotas = Map.empty<Principal, Nat>();
  let trashMetadata = Map.empty<Text, TrashMetadata>();
  let globalRetentionPeriod = Map.empty<Principal, DefaultRetentionPeriod>();
  let userRetentionPeriods = Map.empty<Principal, RetentionPeriod>();
  let activityLogs = Map.empty<Nat, ActivityLog>();
  let fileShares = Map.empty<Text, FileShare>();
  let userFavorites = Map.empty<Principal, Set.Set<Text>>();
  let notifications = Map.empty<Principal, List.List<Notification>>();
  let userAccessPatterns = Map.empty<Principal, Map.Map<Text, AccessPattern>>();
  let sharedFilesByRecipient = Map.empty<Principal, List.List<SharedFileInfo>>();
  let sharedFilesBySender = Map.empty<Principal, List.List<FileShare>>();
  var logCounter : Nat = 0;
  var notificationCounter : Nat = 0;
  let folderMetadata = Map.empty<Text, Folder>();
  let userFavoriteFolders = Map.empty<Principal, Set.Set<Text>>();
  let trashFolderMetadata = Map.empty<Text, TrashFolderMetadata>();
  let folderProtections = Map.empty<Text, FolderProtection>();

  // Returns all registered users with their storage usage (bytes used) and assigned quota (bytes).
  // Admin-only.
  public query ({ caller }) func getRegisteredUsersWithQuota() : async [(Principal, Nat, Nat)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view registered users with quota");
    };

    userProfiles.toArray().map(
      func((principal, _)) {
        let used = switch (userStorageUsed.get(principal)) {
          case (?used) { used };
          case (null) { 0 };
        };

        let quota = getUserQuota(principal);

        (principal, used, quota);
      }
    );
  };

  // Sets a per-user storage quota in bytes. Admin-only.
  // If no quota has been explicitly set for a user, the default of 1 GB applies.
  public shared ({ caller }) func setUserQuotaInBytes(user : Principal, quota : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set user quotas");
    };

    userQuotas.add(user, quota);
  };

  func getUserQuota(user : Principal) : Nat {
    switch (userQuotas.get(user)) {
      case (?quota) { quota };
      case (null) {
        // Default quota for all users is 1 GB (1,073,741,824 bytes)
        DEFAULT_QUOTA;
      };
    };
  };

  func getStorageUsed(user : Principal) : Nat {
    switch (userStorageUsed.get(user)) {
      case (?used) { used };
      case (null) { 0 };
    };
  };

  func updateStorageUsed(user : Principal, delta : Int) {
    let currentUsed = getStorageUsed(user);
    let newUsed = if (Int.abs(delta) >= 0) {
      let proposed = currentUsed.toInt() + delta;
      if (proposed < 0) { 0 } else { Int.abs(proposed) };
    } else {
      currentUsed + Int.abs(delta);
    };
    userStorageUsed.add(user, newUsed);
  };

  func logActivity(user : Principal, action : Text, fileId : Text, fileName : Text, details : Text) {
    let log : ActivityLog = {
      timestamp = Int.abs(Time.now());
      user;
      action;
      fileId;
      fileName;
      details;
    };
    activityLogs.add(logCounter, log);
    logCounter += 1;
  };

  func formatRelativeTime(pastTimestamp : Nat) : Text {
    let currentTime = Int.abs(Time.now());
    // Correct potential underflow
    let diff = if (pastTimestamp > currentTime) {
      pastTimestamp - currentTime;
    } else {
      currentTime - pastTimestamp;
    };

    let second = 1_000_000_000;
    let minute = 60 * second;
    let hour = 60 * minute;
    let day = 24 * hour;
    let week = 7 * day;

    if (diff < minute) {
      (diff / second).toText() # " seconds ago";
    } else if (diff < hour) {
      (diff / minute).toText() # " minutes ago";
    } else if (diff < day) {
      (diff / hour).toText() # " hours ago";
    } else if (diff < week) {
      (diff / day).toText() # " days ago";
    } else {
      (diff / week).toText() # " weeks ago";
    };
  };

  func hasFileAccess(caller : Principal, fileId : Text) : Bool {
    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (metadata.owner == caller or AccessControl.isAdmin(accessControlState, caller)) {
          return true;
        };

        switch (fileShares.get(fileId)) {
          case (?share) {
            if (share.sharedWith == caller and share.permissions.canView) {
              return true;
            };
          };
          case (null) {};
        };

        false;
      };
      case (null) { false };
    };
  };

  func hasFileDownloadAccess(caller : Principal, fileId : Text) : Bool {
    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (metadata.owner == caller or AccessControl.isAdmin(accessControlState, caller)) {
          return true;
        };

        switch (fileShares.get(fileId)) {
          case (?share) {
            if (share.sharedWith == caller and share.permissions.canDownload) {
              return true;
            };
          };
          case (null) {};
        };

        false;
      };
      case (null) { false };
    };
  };

  func getAllSubfolderIds(folderId : Text) : [Text] {
    var subfolderIds : [Text] = [];

    for ((id, folder) in folderMetadata.entries()) {
      switch (folder.parentId) {
        case (?parentId) {
          if (parentId == folderId) {
            subfolderIds := subfolderIds.concat([id]);
            let childSubfolders = getAllSubfolderIds(id);
            subfolderIds := subfolderIds.concat(childSubfolders);
          };
        };
        case (null) {};
      };
    };

    for ((id, trashFolder) in trashFolderMetadata.entries()) {
      switch (trashFolder.folder.parentId) {
        case (?parentId) {
          if (parentId == folderId) {
            subfolderIds := subfolderIds.concat([id]);
            let childSubfolders = getAllSubfolderIds(id);
            subfolderIds := subfolderIds.concat(childSubfolders);
          };
        };
        case (null) {};
      };
    };

    subfolderIds;
  };

  func getFilesInFolderHierarchy(folderId : Text) : [Text] {
    var fileIds : [Text] = [];

    for ((id, file) in fileMetadata.entries()) {
      switch (file.folderId) {
        case (?fId) {
          if (fId == folderId) {
            fileIds := fileIds.concat([id]);
          };
        };
        case (null) {};
      };
    };

    for ((id, trashFile) in trashMetadata.entries()) {
      switch (trashFile.metadata.folderId) {
        case (?fId) {
          if (fId == folderId) {
            fileIds := fileIds.concat([id]);
          };
        };
        case (null) {};
      };
    };

    let subfolderIds = getAllSubfolderIds(folderId);
    for (subfolderId in subfolderIds.vals()) {
      let subfolderFiles = getFilesInFolderHierarchy(subfolderId);
      fileIds := fileIds.concat(subfolderFiles);
    };

    fileIds;
  };

  func verifyFolderHierarchyOwnership(folderId : Text, expectedOwner : Principal, caller : Principal) : Bool {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    switch (trashFolderMetadata.get(folderId)) {
      case (?trashFolder) {
        if (not isAdmin and trashFolder.owner != expectedOwner) {
          return false;
        };
      };
      case (null) {
        return false;
      };
    };

    let subfolderIds = getAllSubfolderIds(folderId);
    for (subfolderId in subfolderIds.vals()) {
      switch (trashFolderMetadata.get(subfolderId)) {
        case (?trashFolder) {
          if (not isAdmin and trashFolder.owner != expectedOwner) {
            return false;
          };
        };
        case (null) {};
      };
    };

    let fileIds = getFilesInFolderHierarchy(folderId);
    for (fileId in fileIds.vals()) {
      switch (trashMetadata.get(fileId)) {
        case (?trashFile) {
          if (not isAdmin and trashFile.metadata.owner != expectedOwner) {
            return false;
          };
        };
        case (null) {};
      };
    };

    true;
  };

  func verifyActiveFolderHierarchyOwnership(folderId : Text, expectedOwner : Principal, caller : Principal) : Bool {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (not isAdmin and folder.owner != expectedOwner) {
          return false;
        };
      };
      case (null) {
        return false;
      };
    };

    let subfolderIds = getAllSubfolderIds(folderId);
    for (subfolderId in subfolderIds.vals()) {
      switch (folderMetadata.get(subfolderId)) {
        case (?folder) {
          if (not isAdmin and folder.owner != expectedOwner) {
            return false;
          };
        };
        case (null) {};
      };
    };

    let fileIds = getFilesInFolderHierarchy(folderId);
    for (fileId in fileIds.vals()) {
      switch (fileMetadata.get(fileId)) {
        case (?file) {
          if (not isAdmin and file.owner != expectedOwner) {
            return false;
          };
        };
        case (null) {};
      };
    };

    true;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public query ({ caller }) func getAdministrationsTableData() : async [(Principal, Text)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view the administrations table");
    };

    userProfiles.toArray().map(
      func((principal, profile)) {
        (principal, profile.name);
      }
    );
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func createFolder(name : Text, parentId : ?Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create folders");
    };

    let folderId = Int.abs(Time.now()).toText() # caller.toText();
    let folder : Folder = {
      id = folderId;
      name;
      owner = caller;
      parentId;
      createdAt = Int.abs(Time.now());
    };

    folderMetadata.add(folderId, folder);

    let protection : FolderProtection = {
      hashedPassword = null;
      isLocked = false;
      failedAttempts = 0;
    };
    folderProtections.add(folderId, protection);

    folderId;
  };

  public query ({ caller }) func getFolder(folderId : Text) : async ?Folder {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view folders");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
          Runtime.trap("Unauthorized: Can only view your own folders");
        };
        ?folder;
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func listFolders() : async [Folder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list folders");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let folders = folderMetadata.values().toArray();

    if (isAdmin) {
      folders;
    } else {
      folders.filter(func(folder) { folder.owner == caller });
    };
  };

  public shared ({ caller }) func moveFilesToFolder(fileIds : [Text], targetFolderId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can move files");
    };

    switch (folderMetadata.get(targetFolderId)) {
      case (?folder) {
        if (folder.owner != caller and not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Folder not found");
        };

        for (fileId in fileIds.values()) {
          switch (fileMetadata.get(fileId)) {
            case (?metadata) {
              if (metadata.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
                Runtime.trap("Unauthorized: Cannot move files owned by others");
              };

              let updatedMetadata = {
                metadata with folderId = ?targetFolderId;
              };
              fileMetadata.add(fileId, updatedMetadata);
            };
            case (null) { Runtime.trap("File not found") };
          };
        };
        return true;
      };
      case (null) { Runtime.trap("Target folder not found") };
    };
  };

  public shared ({ caller }) func favoriteFolder(folderId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can favorite folders");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
          Runtime.trap("Unauthorized: Cannot favorite folders owned by others");
        };

        let favorites = switch (userFavoriteFolders.get(caller)) {
          case (?existing) { existing };
          case (null) { Set.empty<Text>() };
        };

        favorites.add(folderId);
        userFavoriteFolders.add(caller, favorites);
        let favoritesSize = favorites.size();
        favoritesSize > 0;
      };
      case (null) { Runtime.trap("Folder not found") };
    };
  };

  public shared ({ caller }) func unfavoriteFolder(folderId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfavorite folders");
    };

    switch (userFavoriteFolders.get(caller)) {
      case (?favorites) {
        favorites.remove(folderId);
        userFavoriteFolders.add(caller, favorites);
        let favoritesSize = favorites.size();
        favoritesSize > 0;
      };
      case (null) { false };
    };
  };

  public query ({ caller }) func isFavoriteFolder(folderId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check favorites");
    };

    switch (userFavoriteFolders.get(caller)) {
      case (?favorites) { favorites.contains(folderId) };
      case (null) { false };
    };
  };

  public query ({ caller }) func getFavoriteFolders() : async [Folder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view favorite folders");
    };

    let favorites : [Text] = switch (userFavoriteFolders.get(caller)) {
      case (?favorites) { favorites.toArray() };
      case (null) { [] };
    };

    favorites.map(
      func(folderId) {
        switch (folderMetadata.get(folderId)) {
          case (?folder) { folder };
          case (null) {
            {
              id = folderId;
              name = "";
              owner = Principal.fromText("2vxsx-fae");
              parentId = null;
              createdAt = Int.abs(Time.now());
            };
          };
        };
      }
    );
  };

  public shared ({ caller }) func renameFolder(folderId : Text, newName : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can rename folders");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Cannot rename folders owned by others");
        };

        let updatedFolder = {
          folder with name = newName;
        };
        folderMetadata.add(folderId, updatedFolder);
        true;
      };
      case (null) { Runtime.trap("Folder not found") };
    };
  };

  /// Improved function to move a folder (with recursive subtree traversal and proper authorization)
  public shared ({ caller }) func moveFolder(folderId : Text, destFolderId : ?Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can move folders");
    };

    let maybeFolder = folderMetadata.get(folderId);
    switch (maybeFolder) {
      case (null) {
        Runtime.trap("Folder not found in folderMetadata");
      };
      case (?folder) {
        let isAdmin = AccessControl.isAdmin(accessControlState, caller);

        // Check ownership of the folder being moved
        if (not isAdmin and caller != folder.owner) {
          Runtime.trap("Unauthorized: Cannot move folders owned by others");
        };

        // Validate destination folder exists and caller has access
        let newParentId = switch (destFolderId) {
          case (null) { null };
          case (?parentId) {
            let destFolderOpt = folderMetadata.get(parentId);
            switch (destFolderOpt) {
              case (null) {
                Runtime.trap("Destination parent folder not found");
              };
              case (?destFolder) {
                // Verify caller has access to destination folder
                if (not isAdmin and caller != destFolder.owner) {
                  Runtime.trap("Unauthorized: Cannot move to folders owned by others");
                };
                ?parentId;
              };
            };
          };
        };

        // Helper function to verify ownership of entire subtree before making changes
        func verifySubtreeOwnership(folderId : Text, expectedOwner : Principal) : Bool {
          // Check the folder itself
          switch (folderMetadata.get(folderId)) {
            case (null) { return false };
            case (?folder) {
              if (not isAdmin and folder.owner != expectedOwner) {
                return false;
              };
            };
          };

          // Check all direct children folders
          for ((_, childFolder) in folderMetadata.entries()) {
            switch (childFolder.parentId) {
              case (?parentId) {
                if (parentId == folderId) {
                  if (not verifySubtreeOwnership(childFolder.id, expectedOwner)) {
                    return false;
                  };
                };
              };
              case (null) {};
            };
          };

          // Check all files in this folder
          for ((_, file) in fileMetadata.entries()) {
            switch (file.folderId) {
              case (?fId) {
                if (fId == folderId) {
                  if (not isAdmin and file.owner != expectedOwner) {
                    return false;
                  };
                };
              };
              case (null) {};
            };
          };

          true;
        };

        // Verify ownership of entire subtree before proceeding
        if (not verifySubtreeOwnership(folderId, folder.owner)) {
          Runtime.trap("Unauthorized: Cannot move folder tree containing items owned by others");
        };

        // Helper function to recursively update parentId for all subfolders
        func updateSubfoldersParentId(folderId : Text, newParentId : ?Text) {
          let updatedFolder = switch (folderMetadata.get(folderId)) {
            case (null) {
              Runtime.trap("Inconsistent folder state: folderId not found");
            };
            case (?folder) { { folder with parentId = newParentId } };
          };
          folderMetadata.add(folderId, updatedFolder);

          // Find all direct children of this folder and recurse on them
          for ((_, childFolder) in folderMetadata.entries()) {
            switch (childFolder.parentId) {
              case (?parentId) {
                if (parentId == folderId) {
                  updateSubfoldersParentId(childFolder.id, ?folderId);
                };
              };
              case (null) {};
            };
          };

          // Update files contained in this folder (if any) to ensure correct folderId reference
          for ((fileId, file) in fileMetadata.entries()) {
            switch (file.folderId) {
              case (?fId) {
                if (fId == folderId) {
                  let updatedFile = { file with folderId = ?folderId };
                  fileMetadata.add(fileId, updatedFile);
                };
              };
              case (null) {};
            };
          };
        };

        // Perform recursive update starting with the specified folderId
        updateSubfoldersParentId(folderId, newParentId);

        true;
      };
    };
  };

  public shared ({ caller }) func permanentlyDeleteFolder(folderId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can permanently delete folders");
    };

    switch (trashFolderMetadata.get(folderId)) {
      case (?trashEntry) {
        let folder = trashEntry.folder;

        if (folder.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot permanently delete folders owned by others");
        };

        if (not verifyFolderHierarchyOwnership(folderId, folder.owner, caller)) {
          Runtime.trap("Unauthorized: Cannot permanently delete folder hierarchy containing items owned by others");
        };

        let fileIds = getFilesInFolderHierarchy(folderId);
        for (fileId in fileIds.vals()) {
          switch (trashMetadata.get(fileId)) {
            case (?trashFile) {
              fileChunks.remove(fileId);
              trashMetadata.remove(fileId);
            };
            case (null) {};
          };
        };

        let subfolderIds = getAllSubfolderIds(folderId);
        for (subfolderId in subfolderIds.vals()) {
          trashFolderMetadata.remove(subfolderId);
        };

        trashFolderMetadata.remove(folderId);

        logActivity(
          caller,
          "PERMANENT_DELETE",
          folderId,
          folder.name,
          "Folder and all contents permanently deleted",
        );

        true;
      };
      case (null) {
        Runtime.trap("Folder not found in trash");
      };
    };
  };

  public shared ({ caller }) func deleteExpiredTrash() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete expired trash");
    };
    let now = Int.abs(Time.now());
    var deletedCount = 0;

    for ((fileId, trashEntry) in trashMetadata.entries()) {
      let expirationTime = if (now + trashEntry.retentionPeriod < trashEntry.deletedAt) {
        0;
      } else {
        if (now + trashEntry.retentionPeriod > trashEntry.deletedAt) {
          now + trashEntry.retentionPeriod - trashEntry.deletedAt;
        } else {
          // Should not happen, but just in case
          0;
        };
      };
      if (now >= expirationTime) {
        fileChunks.remove(fileId);
        trashMetadata.remove(fileId);

        logActivity(
          caller,
          "AUTO_DELETE",
          fileId,
          trashEntry.metadata.name,
          "File automatically deleted after retention period expired",
        );
        deletedCount += 1;
      };
    };

    deletedCount;
  };

  public query ({ caller }) func getFilesInFolder(folderId : Text) : async [FileMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view folder contents");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Cannot view folder contents for others");
        };

        let files = fileMetadata.values().toArray();
        files.filter(func(file) { file.folderId == ?folderId });
      };
      case (null) { Runtime.trap("Folder not found") };
    };
  };

  public query ({ caller }) func getFilesInFolderWithFavorites(folderId : Text) : async [FileMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view folder contents");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Cannot view folder contents for others");
        };

        let files = fileMetadata.values().toArray();
        files.filter(func(file) { file.folderId == ?folderId });
      };
      case (null) { Runtime.trap("Folder not found") };
    };
  };

  public query ({ caller }) func listAllFoldersWithFavorites() : async [Folder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list folders");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let folders = folderMetadata.values().toArray();

    if (isAdmin) {
      folders;
    } else {
      folders.filter(func(folder) { folder.owner == caller });
    };
  };

  /// Extended uploadFileChunk
  public shared ({ caller }) func uploadFileChunk(
    fileId : Text,
    fileName : Text,
    chunkIndex : Nat,
    chunkData : Blob,
    totalChunks : Nat,
    totalSize : Nat,
    folderId : ?Text,
  ) : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload files");
    };

    // Validate folder ownership if folderId is provided
    switch (folderId) {
      case (?id) {
        switch (folderMetadata.get(id)) {
          case (?folder) {
            if (folder.owner != caller and not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
              Runtime.trap("Unauthorized: Cannot upload to folders owned by others");
            };
          };
          case (null) {
            Runtime.trap("Unauthorized: Folder with ID " # id # " does not exist. You must provide a valid folder ID or none at all.");
          };
        };
      };
      case (null) {};
    };

    if (chunkIndex == 0) {
      let used = getStorageUsed(caller);
      let quota = getUserQuota(caller);
      if (used + totalSize > quota) {
        return null;
      };

      let metadata : FileMetadata = {
        id = fileId;
        name = fileName;
        size = totalSize;
        owner = caller;
        uploadedAt = 0;
        folderId;
      };
      fileMetadata.add(fileId, metadata);

      fileChunks.add(
        fileId,
        {
          blobs = [(chunkIndex, chunkData)];
          metadata;
        },
      );
    } else {
      // For subsequent chunks, verify file ownership
      switch (fileMetadata.get(fileId)) {
        case (?metadata) {
          if (metadata.owner != caller and not (AccessControl.isAdmin(accessControlState, caller))) {
            Runtime.trap("Unauthorized: Cannot upload chunks to files owned by others");
          };
        };
        case (null) {
          Runtime.trap("Unauthorized: File does not exist");
        };
      };

      switch (fileChunks.get(fileId)) {
        case (?existingEntry) {
          let newBlobs = existingEntry.blobs.concat([(chunkIndex, chunkData)]);
          fileChunks.add(
            fileId,
            {
              blobs = newBlobs;
              metadata = existingEntry.metadata;
            },
          );
        };
        case (null) {
          return null;
        };
      };
    };

    if (chunkIndex + 1 == totalChunks) {
      updateStorageUsed(caller, totalSize);
    };

    ?fileId;
  };

  public query ({ caller }) func getFileMetadata(fileId : Text) : async ?FileMetadata {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return null;
    };

    if (not hasFileAccess(caller, fileId)) {
      return null;
    };

    fileMetadata.get(fileId);
  };

  public query ({ caller }) func downloadFileChunk(
    fileId : Text,
    chunkIndex : Nat,
  ) : async ?Blob {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return null;
    };

    if (not hasFileDownloadAccess(caller, fileId)) {
      return null;
    };

    switch (fileChunks.get(fileId)) {
      case (?entry) {
        for ((index, blob) in entry.blobs.vals()) {
          if (index == chunkIndex) {
            return ?blob;
          };
        };
        null;
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func listFiles() : async [FileMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list files");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let files = fileMetadata.values().toArray();

    if (isAdmin) {
      files;
    } else {
      files.filter(func(file) { file.owner == caller });
    };
  };

  // Favorites management
  public shared ({ caller }) func addFavorite(fileId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add favorites");
    };

    if (not hasFileAccess(caller, fileId)) {
      Runtime.trap("Unauthorized: Cannot favorite files you don't have access to");
    };

    let favorites = switch (userFavorites.get(caller)) {
      case (?existing) { existing };
      case (null) { Set.empty<Text>() };
    };

    favorites.add(fileId);
    userFavorites.add(caller, favorites);
    true;
  };

  public shared ({ caller }) func removeFavorite(fileId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove favorites");
    };

    switch (userFavorites.get(caller)) {
      case (?favorites) {
        if (favorites.contains(fileId)) {
          favorites.remove(fileId);
          userFavorites.add(caller, favorites);
          true;
        } else {
          false;
        };
      };
      case (null) { false };
    };
  };

  public query ({ caller }) func getFavorites() : async [FavoriteFileInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view favorites");
    };

    switch (userFavorites.get(caller)) {
      case (?favorites) {
        let favoriteIds = favorites.toArray();
        favoriteIds.map(
          func(id) {
            switch (fileMetadata.get(id)) {
              case (?metadata) {
                {
                  fileId = id;
                  owner = metadata.owner;
                  fileName = metadata.name;
                  size = metadata.size;
                  addedAt = Int.abs(Time.now());
                  metadata = ?metadata;
                };
              };
              case (null) {
                {
                  fileId = id;
                  owner = caller;
                  fileName = id;
                  size = 0;
                  addedAt = Int.abs(Time.now());
                  metadata = null;
                };
              };
            };
          }
        );
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func isFavorite(fileId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check favorites");
    };

    switch (userFavorites.get(caller)) {
      case (?favorites) { favorites.contains(fileId) };
      case (null) { false };
    };
  };

  // Sharing functionality
  public shared ({ caller }) func shareFile(
    fileId : Text,
    recipient : Principal,
    canView : Bool,
    canEdit : Bool,
    canDownload : Bool,
    message : Text,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can share files");
    };

    if (not (AccessControl.hasPermission(accessControlState, recipient, #user))) {
      Runtime.trap("Unauthorized: Can only share files with registered users");
    };

    if (caller == recipient) {
      Runtime.trap("Invalid operation: Cannot share files with yourself");
    };

    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (metadata.owner != caller) {
          Runtime.trap("Unauthorized: Can only share files you own");
        };

        let permissions : SharePermissions = {
          canView;
          canEdit;
          canDownload;
        };

        let shareRecord : FileShare = {
          fileId;
          owner = caller;
          sharedWith = recipient;
          permissions;
          sharedAt = Int.abs(Time.now());
          message;
        };

        let serializedData = shareRecord;

        fileShares.add(fileId, serializedData);

        let recipientShares = switch (sharedFilesByRecipient.get(recipient)) {
          case (?shares) {
            let existing = sharedFilesByRecipient.get(recipient).unwrap();
            existing;
          };
          case (null) {
            let newList = List.empty<SharedFileInfo>();
            sharedFilesByRecipient.add(recipient, newList);
            newList;
          };
        };
        let sharedInfo : SharedFileInfo = {
          fileId = shareRecord.fileId;
          sharedWith = shareRecord.sharedWith;
          permissions = shareRecord.permissions;
          sharedAt = shareRecord.sharedAt;
          message = shareRecord.message;
          fileName = metadata.name;
          owner = metadata.owner;
          ownerName = "";
          ownerEmail = "";
        };
        recipientShares.add(sharedInfo);

        let senderShares = switch (sharedFilesBySender.get(caller)) {
          case (?shares) { shares };
          case (null) {
            let newList = List.empty<FileShare>();
            sharedFilesBySender.add(caller, newList);
            newList;
          };
        };
        senderShares.add(shareRecord);

        true;
      };
      case (null) {
        Runtime.trap("File not found");
      };
    };
  };

  public query ({ caller }) func getSharesReceived() : async [SharedFileInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view received shares");
    };

    switch (sharedFilesByRecipient.get(caller)) {
      case (?shares) { shares.toArray() };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getSharesSent() : async [FileShare] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sent shares");
    };

    switch (sharedFilesBySender.get(caller)) {
      case (?shares) { shares.toArray() };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func revokeShare(fileId : Text, recipient : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can revoke shares");
    };

    switch (fileShares.get(fileId)) {
      case (?share) {
        if (share.owner != caller) {
          Runtime.trap("Unauthorized: Can only revoke shares for files you own");
        };

        if (share.sharedWith != recipient) {
          Runtime.trap("Invalid operation: File is not shared with specified recipient");
        };

        fileShares.remove(fileId);

        switch (sharedFilesByRecipient.get(recipient)) {
          case (?recipientShares) {
            let updatedShares = recipientShares.toArray();
            let filteredShares = updatedShares.filter(func(share) { share.fileId != fileId });
            recipientShares.clear();
            for (share in filteredShares.values()) {
              recipientShares.add(share);
            };
          };
          case (null) {};
        };

        switch (sharedFilesBySender.get(caller)) {
          case (?senderShares) {
            let updatedShares = senderShares.toArray();
            let filteredShares = updatedShares.filter(func(share) { share.fileId != fileId });
            senderShares.clear();
            for (share in filteredShares.values()) {
              senderShares.add(share);
            };
          };
          case (null) {};
        };

        true;
      };
      case (null) {
        Runtime.trap("Share not found");
      };
    };
  };

  public query ({ caller }) func getSharedFileInfo(fileId : Text, recipient : Principal) : async ?FileShare {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view shared file info");
    };

    switch (fileShares.get(fileId)) {
      case (?share) {
        if (share.owner != caller and share.sharedWith != caller) {
          Runtime.trap("Unauthorized: Can only view shares you own or are recipient of");
        };
        if (share.sharedWith != recipient) {
          return null;
        };
        ?share;
      };
      case (null) { null };
    };
  };

  // User notifications
  public shared ({ caller }) func addNotification(toUser : Principal, notificationType : NotificationType) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add notifications");
    };

    let notification : Notification = {
      id = notificationCounter;
      timestamp = Int.abs(Time.now());
      notificationType;
      isRead = false;
      toUser;
    };

    let userNotifications = switch (notifications.get(toUser)) {
      case (?existing) { existing };
      case (null) { List.empty<Notification>() };
    };

    userNotifications.add(notification);
    notifications.add(toUser, userNotifications);

    notificationCounter += 1;
    true;
  };

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };

    switch (notifications.get(caller)) {
      case (?userNotifications) { userNotifications.toArray() };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func markNotificationAsRead(notificationId : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications");
    };

    switch (notifications.get(caller)) {
      case (?userNotifications) {
        let updatedNotifications = userNotifications.map<Notification, Notification>(
          func(n) {
            if (n.id == notificationId) {
              { n with isRead = true };
            } else {
              n;
            };
          }
        );

        userNotifications.clear();
        for (n in updatedNotifications.toArray().values()) {
          userNotifications.add(n);
        };
        true;
      };
      case (null) { false };
    };
  };

  public query ({ caller }) func getUnreadNotificationsCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };

    let notificationsOpt = notifications.get(caller);
    var count : Nat = 0;

    switch (notificationsOpt) {
      case (?userNotifications) {
        for (notification in userNotifications.values()) {
          if (not notification.isRead) {
            count += 1;
          };
        };
      };
      case (null) {};
    };

    count;
  };

  // Most accessed files
  public shared ({ caller }) func recordFileAccess(fileId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record access");
    };

    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (not hasFileAccess(caller, fileId)) {
          Runtime.trap("Unauthorized: Cannot record access for files you don't have access to");
        };

        let accessPatterns = switch (userAccessPatterns.get(caller)) {
          case (?patterns) { patterns };
          case (null) {
            let newPatternsMap = Map.empty<Text, AccessPattern>();
            userAccessPatterns.add(caller, newPatternsMap);
            newPatternsMap;
          };
        };

        let currentPattern = switch (accessPatterns.get(fileId)) {
          case (?pattern) {
            {
              pattern with
              accessCount = pattern.accessCount + 1;
              lastAccessed = Int.abs(Time.now());
            };
          };
          case (null) {
            {
              fileId;
              accessCount = 1;
              lastAccessed = Int.abs(Time.now());
            };
          };
        };

        accessPatterns.add(fileId, currentPattern);

        accessPatterns.entries().forEach(
          func((fileId, pattern)) {
            var _fileId = fileId;
            var _pattern = pattern;
          }
        );

        true;
      };
      case (null) {
        Runtime.trap("File not found");
      };
    };
  };

  public query ({ caller }) func getMostAccessedFiles(limit : Nat) : async [AccessedFileInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view access patterns");
    };

    switch (userAccessPatterns.get(caller)) {
      case (?accessPatterns) {
        let entries = accessPatterns.entries().toArray();
        entries.map(
          func((_, pattern)) {
            {
              fileId = pattern.fileId;
              fileName = switch (fileMetadata.get(pattern.fileId)) {
                case (?metadata) { metadata.name };
                case (null) { pattern.fileId };
              };
              accessCount = pattern.accessCount;
              lastAccessed = pattern.lastAccessed;
              relativeTime = formatRelativeTime(pattern.lastAccessed);
              owner = switch (fileMetadata.get(pattern.fileId)) {
                case (?metadata) { metadata.owner };
                case (null) { caller };
              };
              metadata = fileMetadata.get(pattern.fileId);
            };
          }
        );
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getSmartSuggestions(limit : Nat) : async [SmartSuggestion] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view suggestions");
    };

    let mostAccessed = switch (userAccessPatterns.get(caller)) {
      case (?accessPatterns) {
        let entries = accessPatterns.entries().toArray();
        let size = entries.size();
        let take = if (limit > size) { size } else { limit };
        entries.sliceToArray(0, take);
      };
      case (null) { [] };
    };

    let suggestions = mostAccessed.map(
      func((_, accessed)) {
        switch (fileMetadata.get(accessed.fileId)) {
          case (?metadata) {
            {
              fileId = metadata.id;
              fileName = metadata.name;
              reason = "Frequently accessed by you";
              accessCount = accessed.accessCount;
              lastAccessed = accessed.lastAccessed;
              relativeTime = formatRelativeTime(accessed.lastAccessed);
            };
          };
          case (null) {
            {
              fileId = accessed.fileId;
              fileName = accessed.fileId;
              reason = "Recently accessed";
              accessCount = accessed.accessCount;
              lastAccessed = accessed.lastAccessed;
              relativeTime = formatRelativeTime(accessed.lastAccessed);
            };
          };
        };
      }
    );
    suggestions;
  };

  // Trash and retention management
  public query ({ caller }) func getTrashRetentionPeriod() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view retention period");
    };
    switch (userRetentionPeriods.get(caller)) {
      case (?period) { period };
      case (null) { DEFAULT_RETENTION_PERIOD };
    };
  };

  public query ({ caller }) func getUserRetentionPeriod(user : Principal) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view other users' retention periods");
    };
    switch (userRetentionPeriods.get(user)) {
      case (?period) { period };
      case (null) { DEFAULT_RETENTION_PERIOD };
    };
  };

  public shared ({ caller }) func setUserRetentionPeriod(user : Principal, retentionPeriod : RetentionPeriod) : async () {
    if (caller != user and not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Can only set your own retention period or be an admin");
    };
    if (caller == user and not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set retention period");
    };
    userRetentionPeriods.add(user, retentionPeriod);
  };

  public shared ({ caller }) func setGlobalRetentionPeriod(period : RetentionPeriod) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set global retention period");
    };
    globalRetentionPeriod.add(caller, period);
  };

  public shared ({ caller }) func deleteFile(
    fileId : Text,
    originalPath : Text,
    customRetentionPeriod : ?RetentionPeriod
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete files");
    };

    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (metadata.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot delete files owned by others");
        };

        updateStorageUsed(metadata.owner, -metadata.size);
        fileMetadata.remove(fileId);

        let retentionPeriod = switch (customRetentionPeriod) {
          case (?custom) { custom };
          case (null) {
            switch (userRetentionPeriods.get(caller)) {
              case (?period) { period };
              case (null) { DEFAULT_RETENTION_PERIOD };
            };
          };
        };

        let trashEntry : TrashMetadata = {
          fileId;
          metadata;
          originalPath;
          retentionPeriod;
          deletedAt = Int.abs(Time.now());
        };

        trashMetadata.add(fileId, trashEntry);

        logActivity(
          caller,
          "DELETE",
          fileId,
          metadata.name,
          "File moved to trash from: " # originalPath,
        );

        true;
      };
      case (null) {
        Runtime.trap("File not found");
      };
    };
  };

  public shared ({ caller }) func restoreFile(fileId : Text, newPath : ?Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can restore files");
    };

    switch (trashMetadata.get(fileId)) {
      case (?trashEntry) {
        let metadata = trashEntry.metadata;

        if (metadata.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot restore files owned by others");
        };

        fileMetadata.add(fileId, metadata);
        trashMetadata.remove(fileId);

        updateStorageUsed(metadata.owner, metadata.size);

        let restoredPath = switch (newPath) {
          case (?path) { path };
          case (null) { trashEntry.originalPath };
        };

        logActivity(
          caller,
          "RESTORE",
          fileId,
          metadata.name,
          "File restored to: " # restoredPath,
        );

        true;
      };
      case (null) {
        Runtime.trap("File not found in trash");
      };
    };
  };

  public shared ({ caller }) func permanentlyDeleteFile(fileId : Text, secureWipe : Bool) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can permanently delete files");
    };

    switch (trashMetadata.get(fileId)) {
      case (?trashEntry) {
        let metadata = trashEntry.metadata;

        if (metadata.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot permanently delete files owned by others");
        };

        fileChunks.remove(fileId);
        trashMetadata.remove(fileId);

        logActivity(
          caller,
          "PERMANENT_DELETE",
          fileId,
          metadata.name,
          if (secureWipe) { "File permanently deleted with secure wipe" } else { "File permanently deleted" },
        );

        true;
      };
      case (null) {
        Runtime.trap("File not found in trash");
      };
    };
  };

  public query ({ caller }) func getTrashStorageUsage() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view trash storage");
    };

    let entries = trashMetadata.values().toArray();
    let userEntries = entries.filter(
      func(entry) { entry.metadata.owner == caller }
    );

    var totalSize : Nat = 0;
    for (entry in userEntries.vals()) {
      totalSize += entry.metadata.size;
    };
    totalSize;
  };

  public query ({ caller }) func getActivityLogs(limit : Nat) : async [ActivityLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view activity logs");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let logs = activityLogs.values().toArray();

    let filteredLogs = if (isAdmin) {
      logs;
    } else {
      logs.filter(func(log) { log.user == caller });
    };

    let sortedLogs = filteredLogs.sort(
      func(a, b) { Nat.compare(b.timestamp, a.timestamp) }
    );

    if (sortedLogs.size() <= limit) {
      sortedLogs;
    } else {
      sortedLogs.sliceToArray(0, limit);
    };
  };

  public query ({ caller }) func getRecentActivities(limit : Nat) : async [RecentActivity] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view recent activities");
    };

    let logs = activityLogs.values().toArray();
    let filteredLogs = logs.filter(func(log) { log.user == caller });
    let sortedLogs = filteredLogs.sort(
      func(a, b) { Nat.compare(b.timestamp, a.timestamp) }
    );

    let limitedLogs = if (sortedLogs.size() <= limit) {
      sortedLogs;
    } else {
      sortedLogs.sliceToArray(0, limit);
    };

    limitedLogs.map(
      func(log) {
        {
          log with
          relativeTime = formatRelativeTime(log.timestamp);
        };
      }
    );
  };

  public shared ({ caller }) func setUserQuota(user : Principal, quota : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set user quotas");
    };
    userQuotas.add(user, quota);
  };

  public query ({ caller }) func getStorageQuota() : async {
    used : Nat;
    available : Nat;
    total : Nat;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view storage quota");
    };
    let used = getStorageUsed(caller);
    let total = getUserQuota(caller);
    let available = if (total > used) { total - used } else { 0 };
    { used; available; total };
  };

  public query ({ caller }) func listAllUsersStorage() : async [(Principal, Nat, Nat)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all users' storage");
    };

    let users = userStorageUsed.entries().toArray();
    users.map<(Principal, Nat), (Principal, Nat, Nat)>(
      func((user, used)) {
        (user, used, getUserQuota(user));
      }
    );
  };

  // Trash file listing
  public query ({ caller }) func listTrashFiles(ownerFilter : ?Principal) : async [TrashMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view trash files");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    switch (ownerFilter) {
      case (null) {
        let userFiles = trashMetadata.values().toArray();
        userFiles.filter(func(file) { file.metadata.owner == caller });
      };
      case (?owner) {
        if (not isAdmin and caller != owner) {
          Runtime.trap("Unauthorized: Users can only view their own trash");
        };
        let ownerFiles = trashMetadata.values().toArray();
        ownerFiles.filter(func(file) { file.metadata.owner == owner });
      };
    };
  };

  public query ({ caller }) func listTrashFolders(ownerFilter : ?Principal) : async [TrashFolderMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view trash folders");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    switch (ownerFilter) {
      case (null) {
        let userFolders = trashFolderMetadata.values().toArray();
        userFolders.filter(func(folder) { folder.owner == caller });
      };
      case (?owner) {
        if (not isAdmin and caller != owner) {
          Runtime.trap("Unauthorized: Users can only view their own trash");
        };
        let ownerFolders = trashFolderMetadata.values().toArray();
        ownerFolders.filter(func(folder) { folder.owner == owner });
      };
    };
  };

  // listAllTrash is restricted to admins only, as it returns all users' data unfiltered
  public query ({ caller }) func listAllTrash() : async {
    files : [TrashMetadata];
    folders : [TrashFolderMetadata];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can list all trash");
    };
    let files = trashMetadata.values().toArray();
    let folders = trashFolderMetadata.values().toArray();
    { files; folders };
  };

  /// Soft-delete method for folders (Moves folders to trash with retention period)
  public shared ({ caller }) func softDeleteFolder(folderId : Text, customRetentionPeriodDays : ?Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete folders");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        // Validate folder ownership
        if (folder.owner != caller and not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Cannot delete folders owned by others");
        };

        // SECURITY FIX: Verify ownership of entire folder hierarchy before soft-delete
        if (not verifyActiveFolderHierarchyOwnership(folderId, folder.owner, caller)) {
          Runtime.trap("Unauthorized: Cannot delete folder hierarchy containing items owned by others");
        };

        let defaultRetentionPeriodNs = 30 * 24 * 60 * 60 * 1_000_000_000;
        let retentionPeriodNs = switch (customRetentionPeriodDays) {
          case (?days) { days * 24 * 60 * 60 * 1_000_000_000 };
          case (null) { defaultRetentionPeriodNs };
        };

        let trashEntry : TrashFolderMetadata = {
          folder;
          deletedAt = Int.abs(Time.now());
          originalPath = "Unknown";
          retentionPeriod = retentionPeriodNs;
          owner = folder.owner;
        };

        trashFolderMetadata.add(folderId, trashEntry);
        folderMetadata.remove(folderId);

        logActivity(
          caller,
          "SOFT_DELETE",
          folderId,
          folder.name,
          "Folder moved to trash with retention period: " # retentionPeriodNs.toText() # "ns",
        );

        true;
      };
      case (null) {
        Runtime.trap("Folder not found");
      };
    };
  };

  // Folder protection functions

  // Set (or update) a password for a folder.
  // Only the folder owner or an admin can set a password.
  public shared ({ caller }) func setFolderPassword(folderId : Text, hashedPassword : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set folder passwords");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the folder owner or an admin can set a folder password");
        };
        let protection : FolderProtection = {
          hashedPassword = ?hashedPassword;
          isLocked = true;
          failedAttempts = 0;
        };
        folderProtections.add(folderId, protection);
      };
      case (null) {
        Runtime.trap("Folder not found");
      };
    };
  };

  // Remove the password for a folder.
  // Only the folder owner or an admin can remove a password.
  public shared ({ caller }) func removeFolderPassword(folderId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove folder passwords");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the folder owner or an admin can remove a folder password");
        };
        let protection : FolderProtection = {
          hashedPassword = null;
          isLocked = false;
          failedAttempts = 0;
        };
        folderProtections.add(folderId, protection);
      };
      case (null) {
        Runtime.trap("Folder not found");
      };
    };
  };

  // Toggle the locked state of a folder.
  // Only the folder owner or an admin can toggle the lock.
  public shared ({ caller }) func toggleFolderLock(folderId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can toggle folder lock");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the folder owner or an admin can toggle the folder lock");
        };
        switch (folderProtections.get(folderId)) {
          case (?protection) {
            let newState = {
              protection with isLocked = not protection.isLocked;
            };
            folderProtections.add(folderId, newState);
          };
          case (null) {
            Runtime.trap("Folder protection record not found");
          };
        };
      };
      case (null) {
        Runtime.trap("Folder not found");
      };
    };
  };

  // Verify a password attempt for a folder.
  // Any authenticated user can attempt to verify a folder password (e.g., to unlock a shared folder).
  public shared ({ caller }) func verifyFolderPassword(folderId : Text, attempt : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can verify folder passwords");
    };

    switch (folderProtections.get(folderId)) {
      case (?protection) {
        switch (protection.hashedPassword) {
          case (?storedHash) {
            if (storedHash == attempt) {
              let newState = {
                protection with
                failedAttempts = 0;
                isLocked = false;
              };
              folderProtections.add(folderId, newState);
              true;
            } else {
              let newState = {
                protection with failedAttempts = protection.failedAttempts + 1;
              };
              folderProtections.add(folderId, newState);
              false;
            };
          };
          case (null) {
            false;
          };
        };
      };
      case (null) {
        false;
      };
    };
  };

  // Get the current protection status for a folder.
  // Only the folder owner or an admin can view the full protection record.
  public query ({ caller }) func getFolderProtectionStatus(folderId : Text) : async ?FolderProtection {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view folder protection status");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the folder owner or an admin can view folder protection status");
        };
        folderProtections.get(folderId);
      };
      case (null) {
        Runtime.trap("Folder not found");
      };
    };
  };

  // User approval system functions
  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    // No auth check: any caller (including guests/anonymous) may request approval
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  // AC12 - Storage Management
  public query ({ caller }) func getAllUsersQuotaTable() : async [(Principal, Text, Nat)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access storage management");
    };

    userProfiles.toArray().map(func((principal, profile)) { (principal, profile.name, getUserQuota(principal)) });
  };

  // AC13 - Storage Management
  public shared ({ caller }) func setUserQuotas(quotas : [(Principal, Nat)]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set quotas");
    };

    quotas.forEach(func((principal, quota)) { userQuotas.add(principal, quota) });
  };

  public query ({ caller }) func getLoginLogTable() : async [ActivityLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access storage management");
    };

    activityLogs.entries().toArray().map(func((_, log)) { log });
  };

  // Had to add this query globally for authorization to work
  public query ({ caller }) func isAdmin(principal : Principal) : async Bool {
    AccessControl.isAdmin(accessControlState, principal);
  };
};

