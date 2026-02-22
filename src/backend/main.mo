import Map "mo:core/Map";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Set "mo:core/Set";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

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
    let diff = currentTime - pastTimestamp;

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

  private func hasFileAccess(caller : Principal, fileId : Text) : Bool {
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

  private func hasFileDownloadAccess(caller : Principal, fileId : Text) : Bool {
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

  // User profile management
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

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // File upload and download
  public shared ({ caller }) func uploadFileChunk(
    fileId : Text,
    fileName : Text,
    chunkIndex : Nat,
    chunkData : Blob,
    totalChunks : Nat,
    totalSize : Nat,
  ) : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload files");
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
        now + trashEntry.retentionPeriod - trashEntry.deletedAt;
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
};
