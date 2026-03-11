import AccessControl "./access-control";
import Prim "mo:prim";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

mixin (accessControlState : AccessControl.AccessControlState) {
  // Hardcoded admin principal — always granted #admin regardless of token
  let HARDCODED_ADMIN_PRINCIPAL : Principal = Principal.fromText("mgyr5-y3u63-q5gfr-gvkv7-etmf3-nz3hc-uxmc2-7glom-54ilt-kpuzm-vae");

  // Ensure the hardcoded admin is always registered as admin.
  // Called internally before any registration so that adminAssigned is true
  // before regular users are processed, preventing token-based admin hijack.
  func ensureHardcodedAdmin() {
    accessControlState.userRoles.add(HARDCODED_ADMIN_PRINCIPAL, #admin);
    accessControlState.adminAssigned := true;
  };

  public shared ({ caller }) func _initializeAccessControlWithSecret(userSecret : Text) : async () {
    // Always ensure the hardcoded admin is in place first
    ensureHardcodedAdmin();

    // Hardcoded admin itself — already registered above, nothing more to do
    if (caller == HARDCODED_ADMIN_PRINCIPAL) {
      return;
    };

    // Regular users: use standard token-based flow.
    // adminAssigned is now true, so they will always be registered as #user.
    switch (Prim.envVar<system>("CAFFEINE_ADMIN_TOKEN")) {
      case (null) {
        Runtime.trap("CAFFEINE_ADMIN_TOKEN environment variable is not set");
      };
      case (?adminToken) {
        AccessControl.initialize(accessControlState, caller, adminToken, userSecret);
      };
    };
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    // Ensure admin is always recognized
    if (caller == HARDCODED_ADMIN_PRINCIPAL) {
      return #admin;
    };
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    if (caller == HARDCODED_ADMIN_PRINCIPAL) { return true };
    AccessControl.isAdmin(accessControlState, caller);
  };
};
