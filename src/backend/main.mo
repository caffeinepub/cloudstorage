import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";



actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

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

  public type FolderMetadata = {
    id : Text;
    name : Text;
    owner : Principal;
    createdAt : Nat;
    updatedAt : Nat;
    parentFolderId : ?Text;
    isPublic : Bool;
    collaborators : [Principal];
    color : Text;
    tags : [Text];
    description : Text;
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

  let DEFAULT_QUOTA : Nat = 100_000_000;
  let ADMIN_QUOTA : Nat = 1_000_000_000;
  let DEFAULT_RETENTION_PERIOD : DefaultRetentionPeriod = 1000000000 * 60 * 60 * 24 * 30;

  let userProfiles = Map.empty<Principal, UserProfile>();
  let userStorageUsed = Map.empty<Principal, Nat>();
  let fileMetadata = Map.empty<Text, FileMetadata>();
  let fileChunks = Map.empty<Text, FileBlobEntry>();
  let folderMetadata = Map.empty<Text, FolderMetadata>();
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

  private func getUserQuota(user : Principal) : Nat {
    switch (userQuotas.get(user)) {
      case (?quota) { quota };
      case (null) {
        if (AccessControl.isAdmin(accessControlState, user)) {
          ADMIN_QUOTA;
        } else {
          DEFAULT_QUOTA;
        };
      };
    };
  };

  private func getStorageUsed(user : Principal) : Nat {
    switch (userStorageUsed.get(user)) {
      case (?used) { used };
      case (null) { 0 };
    };
  };

  private func updateStorageUsed(user : Principal, delta : Int) {
    let currentUsed = getStorageUsed(user);
    let newUsed = if (Int.abs(delta) >= 0) {
      let proposed = currentUsed.toInt() + delta;
      if (proposed < 0) { 0 } else { Int.abs(proposed) };
    } else {
      currentUsed + Int.abs(delta);
    };
    userStorageUsed.add(user, newUsed);
  };

  private func logActivity(user : Principal, action : Text, fileId : Text, fileName : Text, details : Text) {
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

  private func formatRelativeTime(pastTimestamp : Nat) : Text {
    let currentTime = Int.abs(Time.now());
    let diff = Int.abs(currentTime - pastTimestamp);

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

  private func isCollaborator(user : Principal, folder : FolderMetadata) : Bool {
    folder.collaborators.find<Principal>(func(c) { c == user }) != null;
  };

  private func hasFolderAccess(caller : Principal, folderId : Text) : Bool {
    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner == caller or AccessControl.isAdmin(accessControlState, caller)) {
          return true;
        };
        if (isCollaborator(caller, folder)) {
          return true;
        };
        if (folder.isPublic) {
          return true;
        };
        false;
      };
      case (null) { false };
    };
  };

  private func hasFolderWriteAccess(caller : Principal, folderId : Text) : Bool {
    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner == caller or AccessControl.isAdmin(accessControlState, caller)) {
          return true;
        };
        if (isCollaborator(caller, folder)) {
          return true;
        };
        false;
      };
      case (null) { false };
    };
  };

  private func hasFileAccess(caller : Principal, fileId : Text) : Bool {
    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (metadata.owner == caller or AccessControl.isAdmin(accessControlState, caller)) {
          return true;
        };

        switch (metadata.folderId) {
          case (?folderId) {
            if (hasFolderAccess(caller, folderId)) {
              return true;
            };
          };
          case (null) {};
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

  private func hasFileDownloadAccess(caller : Principal, fileId : Text) : Bool {
    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (metadata.owner == caller or AccessControl.isAdmin(accessControlState, caller)) {
          return true;
        };

        switch (metadata.folderId) {
          case (?folderId) {
            if (hasFolderWriteAccess(caller, folderId)) {
              return true;
            };
          };
          case (null) {};
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

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
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

  public shared ({ caller }) func createFolder(
    name : Text,
    parentFolderId : ?Text,
    isPublic : Bool,
    collaborators : [Principal],
    color : Text,
    tags : [Text],
    description : Text,
  ) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create folders");
    };

    switch (parentFolderId) {
      case (?parentId) {
        if (not hasFolderWriteAccess(caller, parentId)) {
          Runtime.trap("Unauthorized: Cannot create subfolder in a folder you don't have write access to");
        };
      };
      case (null) {};
    };

    let folderId = "folder_" # Int.abs(Time.now()).toText();

    let folder : FolderMetadata = {
      id = folderId;
      name;
      owner = caller;
      createdAt = Int.abs(Time.now());
      updatedAt = Int.abs(Time.now());
      parentFolderId;
      isPublic;
      collaborators;
      color;
      tags;
      description;
    };

    folderMetadata.add(folderId, folder);
    folderId;
  };

  public shared ({ caller }) func renameFolder(folderId : Text, newName : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can rename folders");
    };

    if (newName.size() == 0 or newName.size() > 100) {
      Runtime.trap("Folder name must be between 1 and 100 characters");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (not hasFolderWriteAccess(caller, folderId)) {
          Runtime.trap("Unauthorized: Cannot rename folders you don't have write access to");
        };

        let updatedFolder = {
          folder with
          name = newName;
          updatedAt = Int.abs(Time.now());
        };
        folderMetadata.add(folderId, updatedFolder);
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func editFolder(
    folderId : Text,
    isPublic : Bool,
    collaborators : [Principal],
    color : Text,
    tags : [Text],
    description : Text,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit folders");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only folder owners can edit folder settings");
        };

        let updatedFolder = {
          folder with
          isPublic;
          collaborators;
          color;
          tags;
          description;
          updatedAt = Int.abs(Time.now());
        };
        folderMetadata.add(folderId, updatedFolder);
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func moveFolder(folderId : Text, newParentFolderId : ?Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can move folders");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (not hasFolderWriteAccess(caller, folderId)) {
          Runtime.trap("Unauthorized: Cannot move folders you don't have write access to");
        };

        switch (newParentFolderId) {
          case (?newParentId) {
            if (newParentId == folderId) {
              Runtime.trap("Cannot move folder into itself");
            };
            if (not hasFolderWriteAccess(caller, newParentId)) {
              Runtime.trap("Unauthorized: Cannot move folder to a destination you don't have write access to");
            };
          };
          case (null) {};
        };

        let updatedFolder = {
          folder with
          parentFolderId = newParentFolderId;
          updatedAt = Int.abs(Time.now());
        };
        folderMetadata.add(folderId, updatedFolder);
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func deleteFolder(
    folderId : Text,
    deleteContents : Bool,
    moveContentsToParent : Bool,
  ) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete folders");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (folder.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only folder owners can delete folders");
        };

        if (deleteContents) {
          let filesInFolder = fileMetadata.values().toArray().filter(
            func(f) { f.folderId == ?folderId }
          );
          for (file in filesInFolder.vals()) {
            if (file.owner == caller or AccessControl.isAdmin(accessControlState, caller)) {
              fileMetadata.remove(file.id);
            };
          };

          let subfolders = folderMetadata.values().toArray().filter(
            func(f) { f.parentFolderId == ?folderId }
          );
          for (subfolder in subfolders.vals()) {
            ignore deleteFolder(subfolder.id, true, false);
          };
        } else if (moveContentsToParent) {
          let filesInFolder = fileMetadata.values().toArray().filter(
            func(f) { f.folderId == ?folderId }
          );
          for (file in filesInFolder.vals()) {
            if (file.owner == caller or AccessControl.isAdmin(accessControlState, caller)) {
              let updatedFile = { file with folderId = folder.parentFolderId };
              fileMetadata.add(file.id, updatedFile);
            };
          };

          let subfolders = folderMetadata.values().toArray().filter(
            func(f) { f.parentFolderId == ?folderId }
          );
          for (subfolder in subfolders.vals()) {
            let updatedSubfolder = { subfolder with parentFolderId = folder.parentFolderId };
            folderMetadata.add(updatedSubfolder.id, updatedSubfolder);
          };
        };

        folderMetadata.remove(folderId);
        true;
      };
      case (null) { false };
    };
  };

  public query ({ caller }) func listFolders() : async [FolderMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list folders");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let folders = folderMetadata.values().toArray();

    if (isAdmin) {
      folders;
    } else {
      folders.filter<FolderMetadata>(
        func(folder) {
          folder.owner == caller or isCollaborator(caller, folder) or folder.isPublic;
        }
      );
    };
  };

  public query ({ caller }) func getFolderMetadata(folderId : Text) : async ?FolderMetadata {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access folder metadata");
    };

    switch (folderMetadata.get(folderId)) {
      case (?folder) {
        if (hasFolderAccess(caller, folderId)) {
          ?folder;
        } else {
          null;
        };
      };
      case (null) { null };
    };
  };

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

    switch (folderId) {
      case (?targetFolderId) {
        if (not hasFolderWriteAccess(caller, targetFolderId)) {
          Runtime.trap("Unauthorized: Cannot upload files to a folder you don't have write access to");
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
        uploadedAt = Int.abs(Time.now());
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
      switch (fileMetadata.get(fileId)) {
        case (?metadata) {
          if (metadata.owner != caller) {
            Runtime.trap("Unauthorized: Cannot upload chunks for files you don't own");
          };
        };
        case (null) {
          return null;
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
      logActivity(caller, "upload", fileId, fileName, "File uploaded successfully");
    };

    ?fileId;
  };

  public query ({ caller }) func getFileMetadata(fileId : Text) : async ?FileMetadata {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access file metadata");
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
      Runtime.trap("Unauthorized: Only users can download files");
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
      files.filter<FileMetadata>(
        func(file) { hasFileAccess(caller, file.id) }
      );
    };
  };

  public query ({ caller }) func listFilesByFolder(folderId : ?Text) : async [FileMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list files");
    };

    switch (folderId) {
      case (?targetFolderId) {
        if (not hasFolderAccess(caller, targetFolderId)) {
          Runtime.trap("Unauthorized: Cannot list files in a folder you don't have access to");
        };
      };
      case (null) {};
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let files = fileMetadata.values().toArray();

    files.filter<FileMetadata>(
      func(file) {
        file.folderId == folderId and (isAdmin or hasFileAccess(caller, file.id));
      }
    );
  };
};

