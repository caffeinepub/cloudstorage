import Map "mo:core/Map";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Set "mo:core/Set";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import UserApproval "user-approval/approval";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

// No explicit migration needed!
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let approvalState = UserApproval.initState(accessControlState);

  // Approval functions added after all fields.
  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
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

  // Types
  public type UserStatus = {
    #superAdmin;
    #active;
    #pending;
    #rejected;
    #suspended;
  };

  public type UserEntry = {
    principal : Principal;
    displayName : ?Text;
    status : UserStatus;
    hasCompletedRegistration : Bool;
  };

  let userEntries = Map.empty<Principal, UserEntry>();

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

  let DEFAULT_QUOTA : Nat = 100_000_000;
  let ADMIN_QUOTA : Nat = 1_000_000_000;
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

  func isSuperAdminPrincipal(p : Principal) : Bool {
    switch (userEntries.get(p)) {
      case (?entry) { entry.status == #superAdmin };
      case (null) { false };
    };
  };

  func isAdminOrSuperAdmin(caller : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, caller) or isSuperAdminPrincipal(caller);
  };

  func getUserQuota(user : Principal) : Nat {
    switch (userQuotas.get(user)) {
      case (?quota) { quota };
      case (null) {
        if (isAdminOrSuperAdmin(user)) {
          ADMIN_QUOTA;
        } else {
          DEFAULT_QUOTA;
        };
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
        if (metadata.owner == caller or isAdminOrSuperAdmin(caller)) {
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
        if (metadata.owner == caller or isAdminOrSuperAdmin(caller)) {
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
    let isAdmin = isAdminOrSuperAdmin(caller);

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
    let isAdmin = isAdminOrSuperAdmin(caller);

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
    if (caller != user and not isAdminOrSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func isAdmin() : async Bool {
    isAdminOrSuperAdmin(caller);
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
        if (folder.owner != caller and not isAdminOrSuperAdmin(caller)) {
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

    let isAdminCaller = isAdminOrSuperAdmin(caller);
    let folders = folderMetadata.values().toArray();

    if (isAdminCaller) {
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
        if (folder.owner != caller and not isAdminOrSuperAdmin(caller)) {
          Runtime.trap("Unauthorized: Folder not found");
        };

        for (fileId in fileIds.values()) {
          switch (fileMetadata.get(fileId)) {
            case (?metadata) {
              if (metadata.owner != caller and not isAdminOrSuperAdmin(caller)) {
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
        if (folder.owner != caller and not isAdminOrSuperAdmin(caller)) {
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
        if (folder.owner != caller and not isAdminOrSuperAdmin(caller)) {
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
        let isAdminCaller = isAdminOrSuperAdmin(caller);

        // Check ownership of the folder being moved
        if (not isAdminCaller and caller != folder.owner) {
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
                if (not isAdminCaller and caller != destFolder.owner) {
                  Runtime.trap("Unauthorized: Cannot move to folders owned by others");
                };
                ?parentId;
              };
            };
          };
        };

        // Helper function to verify ownership of entire subtree before making changes
        func verifySubtreeOwnership(fId : Text, expectedOwner : Principal) : Bool {
          // Check the folder itself
          switch (folderMetadata.get(fId)) {
            case (null) { return false };
            case (?f) {
              if (not isAdminCaller and f.owner != expectedOwner) {
                return false;
              };
            };
          };

          // Check all direct children folders
          for ((_, childFolder) in folderMetadata.entries()) {
            switch (childFolder.parentId) {
              case (?pid) {
                if (pid == fId) {
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
              case (?fId2) {
                if (fId2 == fId) {
                  if (not isAdminCaller and file.owner != expectedOwner) {
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
        func updateSubfoldersParentId(fId : Text, newPId : ?Text) {
          let updatedFolder = switch (folderMetadata.get(fId)) {
            case (null) {
              Runtime.trap("Inconsistent folder state: folderId not found");
            };
            case (?f) { { f with parentId = newPId } };
          };
          folderMetadata.add(fId, updatedFolder);

          // Find all direct children of this folder and recurse on them
          for ((_, childFolder) in folderMetadata.entries()) {
            switch (childFolder.parentId) {
              case (?pid) {
                if (pid == fId) {
                  updateSubfoldersParentId(childFolder.id, ?fId);
                };
              };
              case (null) {};
            };
          };

          // Update files contained in this folder (if any) to ensure correct folderId reference
          for ((fileId2, file) in fileMetadata.entries()) {
            switch (file.folderId) {
              case (?fId2) {
                if (fId2 == fId) {
                  let updatedFile = { file with folderId = ?fId };
                  fileMetadata.add(fileId2, updatedFile);
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

        if (folder.owner != caller and not isAdminOrSuperAdmin(caller)) {
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
    if (not isAdminOrSuperAdmin(caller)) {
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
        if (folder.owner != caller and not isAdminOrSuperAdmin(caller)) {
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
        if (folder.owner != caller and not isAdminOrSuperAdmin(caller)) {
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

    let isAdminCaller = isAdminOrSuperAdmin(caller);
    let folders = folderMetadata.values().toArray();

    if (isAdminCaller) {
      folders;
    } else {
      folders.filter(func(folder) { folder.owner == caller });
    };
  };
};
