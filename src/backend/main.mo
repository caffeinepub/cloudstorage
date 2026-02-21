import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

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

  let DEFAULT_QUOTA : Nat = 100_000_000;
  let ADMIN_QUOTA : Nat = 1_000_000_000;

  let userProfiles = Map.empty<Principal, UserProfile>();
  let fileMetadata = Map.empty<Text, FileMetadata>();
  let userStorageUsed = Map.empty<Principal, Nat>();
  let userQuotas = Map.empty<Principal, Nat>();

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
    let newUsed = if (delta >= 0) {
      currentUsed + Int.abs(delta);
    } else {
      let absDelta = Int.abs(delta);
      if (currentUsed >= absDelta) {
        currentUsed - absDelta;
      } else {
        0;
      };
    };
    userStorageUsed.add(user, newUsed);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      return null;
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return null;
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller.isAnonymous()) {
      return null;
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      return null;
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return;
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getStorageQuota() : async {
    used : Nat;
    available : Nat;
    total : Nat;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return { used = 0; available = 0; total = 0 };
    };
    let used = getStorageUsed(caller);
    let total = getUserQuota(caller);
    let available = if (total > used) { total - used } else { 0 };
    { used; available; total };
  };

  public shared ({ caller }) func setUserQuota(user : Principal, quota : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return;
    };
    userQuotas.add(user, quota);
  };

  public shared ({ caller }) func uploadFileChunk(
    fileId : Text,
    fileName : Text,
    chunkIndex : Nat,
    _chunkData : Blob,
    totalChunks : Nat,
    totalSize : Nat,
  ) : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return null;
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
    } else {
      switch (fileMetadata.get(fileId)) {
        case (?metadata) {
          if (metadata.owner != caller) {
            return null;
          };
        };
        case (null) {
          return null;
        };
      };
    };

    if (chunkIndex == totalChunks - 1) {
      updateStorageUsed(caller, totalSize);
    };

    ?fileId;
  };

  public query ({ caller }) func getFileMetadata(fileId : Text) : async ?FileMetadata {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return null;
    };

    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (metadata.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          return null;
        };
        ?metadata;
      };
      case (null) {
        null;
      };
    };
  };

  public query ({ caller }) func downloadFileChunk(
    fileId : Text,
    _chunkIndex : Nat,
  ) : async ?Blob {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return null;
    };

    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (metadata.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          return null;
        };
        null;
      };
      case (null) {
        null;
      };
    };
  };

  public query ({ caller }) func listFiles() : async [FileMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let files = fileMetadata.values().toArray();

    if (isAdmin) {
      files;
    } else {
      files.filter(func(file) { file.owner == caller });
    };
  };

  public shared ({ caller }) func deleteFile(fileId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return false;
    };

    switch (fileMetadata.get(fileId)) {
      case (?metadata) {
        if (metadata.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          return false;
        };

        updateStorageUsed(metadata.owner, -metadata.size);

        fileMetadata.remove(fileId);

        true;
      };
      case (null) {
        false;
      };
    };
  };

  public query ({ caller }) func listAllUsersStorage() : async [(Principal, Nat, Nat)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      return [];
    };

    let users = userStorageUsed.entries().toArray();
    users.map<(Principal, Nat), (Principal, Nat, Nat)>(
      func((user, used)) {
        (user, used, getUserQuota(user));
      }
    );
  };
};
