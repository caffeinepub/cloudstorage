import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Blob "mo:core/Blob";
import Set "mo:core/Set";
import List "mo:core/List";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import Storage "blob-storage/Storage";

module {
  type OldUserStatus = {
    #superAdmin;
    #active;
    #pending;
    #rejected;
    #suspended;
  };

  type OldUserEntry = {
    principal : Principal;
    displayName : ?Text;
    status : OldUserStatus;
    hasCompletedRegistration : Bool;
  };

  type RetentionPeriod = Nat;
  type DefaultRetentionPeriod = Nat;

  type NotificationType = {
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

  type Notification = {
    id : Nat;
    timestamp : Nat;
    notificationType : NotificationType;
    isRead : Bool;
    toUser : Principal;
  };

  type RecentActivity = {
    timestamp : Nat;
    user : Principal;
    action : Text;
    fileId : Text;
    fileName : Text;
    details : Text;
    relativeTime : Text;
  };

  type UserProfile = {
    name : Text;
    email : Text;
  };

  type FileMetadata = {
    id : Text;
    name : Text;
    size : Nat;
    owner : Principal;
    uploadedAt : Nat;
    folderId : ?Text;
  };

  type ActivityLog = {
    timestamp : Nat;
    user : Principal;
    action : Text;
    fileId : Text;
    fileName : Text;
    details : Text;
  };

  type TrashMetadata = {
    fileId : Text;
    metadata : FileMetadata;
    deletedAt : Nat;
    originalPath : Text;
    retentionPeriod : RetentionPeriod;
  };

  type FileBlobEntry = {
    blobs : [(Nat, Blob)];
    metadata : FileMetadata;
  };

  type FileShare = {
    fileId : Text;
    owner : Principal;
    sharedWith : Principal;
    permissions : SharePermissions;
    sharedAt : Nat;
    message : Text;
  };

  type SharedFileInfo = {
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

  type FavoriteFileInfo = {
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

  type AccessPattern = {
    fileId : Text;
    accessCount : Nat;
    lastAccessed : Nat;
  };

  type AccessedFileInfo = {
    fileId : Text;
    fileName : Text;
    accessCount : Nat;
    lastAccessed : Nat;
    relativeTime : Text;
    owner : Principal;
    metadata : ?FileMetadata;
  };

  type SmartSuggestion = {
    fileId : Text;
    fileName : Text;
    reason : Text;
    accessCount : Nat;
    lastAccessed : Nat;
    relativeTime : Text;
  };

  type Folder = {
    id : Text;
    name : Text;
    owner : Principal;
    parentId : ?Text;
    createdAt : Nat;
  };

  type FolderProtection = {
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

  type OldActor = {
    approvalState : UserApproval.UserApprovalState;
    accessControlState : AccessControl.AccessControlState;
    userEntries : Map.Map<Principal, OldUserEntry>;
    userProfiles : Map.Map<Principal, UserProfile>;
    userStorageUsed : Map.Map<Principal, Nat>;
    fileChunks : Map.Map<Text, FileBlobEntry>;
    fileMetadata : Map.Map<Text, FileMetadata>;
    fileShares : Map.Map<Text, FileShare>;
    trashMetadata : Map.Map<Text, TrashMetadata>;
    userFavorites : Map.Map<Principal, Set.Set<Text>>;
    globalRetentionPeriod : Map.Map<Principal, DefaultRetentionPeriod>;
    userQuotas : Map.Map<Principal, Nat>;
    activityLogs : Map.Map<Nat, ActivityLog>;
    notifications : Map.Map<Principal, List.List<Notification>>;
    userAccessPatterns : Map.Map<Principal, Map.Map<Text, AccessPattern>>;
    sharedFilesByRecipient : Map.Map<Principal, List.List<SharedFileInfo>>;
    sharedFilesBySender : Map.Map<Principal, List.List<FileShare>>;
    logCounter : Nat;
    notificationCounter : Nat;
    folderMetadata : Map.Map<Text, Folder>;
    userFavoriteFolders : Map.Map<Principal, Set.Set<Text>>;
    trashFolderMetadata : Map.Map<Text, TrashFolderMetadata>;
    folderProtections : Map.Map<Text, FolderProtection>;
    userRetentionPeriods : Map.Map<Principal, RetentionPeriod>;
  };

  public type NewUserStatus = {
    #active;
    #pending;
    #rejected;
    #suspended;
  };

  public type NewUserEntry = {
    principal : Principal;
    displayName : ?Text;
    status : NewUserStatus;
    hasCompletedRegistration : Bool;
  };

  public type NewActor = {
    approvalState : UserApproval.UserApprovalState;
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    userStorageUsed : Map.Map<Principal, Nat>;
    fileChunks : Map.Map<Text, FileBlobEntry>;
    fileMetadata : Map.Map<Text, FileMetadata>;
    fileShares : Map.Map<Text, FileShare>;
    trashMetadata : Map.Map<Text, TrashMetadata>;
    userFavorites : Map.Map<Principal, Set.Set<Text>>;
    globalRetentionPeriod : Map.Map<Principal, DefaultRetentionPeriod>;
    userQuotas : Map.Map<Principal, Nat>;
    activityLogs : Map.Map<Nat, ActivityLog>;
    notifications : Map.Map<Principal, List.List<Notification>>;
    userAccessPatterns : Map.Map<Principal, Map.Map<Text, AccessPattern>>;
    sharedFilesByRecipient : Map.Map<Principal, List.List<SharedFileInfo>>;
    sharedFilesBySender : Map.Map<Principal, List.List<FileShare>>;
    logCounter : Nat;
    notificationCounter : Nat;
    folderMetadata : Map.Map<Text, Folder>;
    userFavoriteFolders : Map.Map<Principal, Set.Set<Text>>;
    trashFolderMetadata : Map.Map<Text, TrashFolderMetadata>;
    folderProtections : Map.Map<Text, FolderProtection>;
    userRetentionPeriods : Map.Map<Principal, RetentionPeriod>;
  };

  public func run(old : OldActor) : NewActor {
    {
      approvalState = old.approvalState;
      accessControlState = old.accessControlState;
      userProfiles = old.userProfiles;
      userStorageUsed = old.userStorageUsed;
      fileChunks = old.fileChunks;
      fileMetadata = old.fileMetadata;
      fileShares = old.fileShares;
      trashMetadata = old.trashMetadata;
      userFavorites = old.userFavorites;
      globalRetentionPeriod = old.globalRetentionPeriod;
      userQuotas = old.userQuotas;
      activityLogs = old.activityLogs;
      notifications = old.notifications;
      userAccessPatterns = old.userAccessPatterns;
      sharedFilesByRecipient = old.sharedFilesByRecipient;
      sharedFilesBySender = old.sharedFilesBySender;
      logCounter = old.logCounter;
      notificationCounter = old.notificationCounter;
      folderMetadata = old.folderMetadata;
      userFavoriteFolders = old.userFavoriteFolders;
      trashFolderMetadata = old.trashFolderMetadata;
      folderProtections = old.folderProtections;
      userRetentionPeriods = old.userRetentionPeriods;
    };
  };
};
