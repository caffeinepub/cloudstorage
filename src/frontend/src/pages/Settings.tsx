import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Monitor,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  Timer,
  Trash2,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAutoLock } from "../hooks/useAutoLock";
import { hashWithSHA256 } from "../utils/crypto";

const TIMEOUT_OPTIONS = [
  { label: "Never", value: "0" },
  { label: "1 minute", value: "1" },
  { label: "5 minutes", value: "5" },
  { label: "10 minutes", value: "10" },
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "1 hour", value: "60" },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useAutoLock();

  // Account tab
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  // Notifications tab
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [activityAlerts, setActivityAlerts] = useState(true);
  const [storageWarnings, setStorageWarnings] = useState(true);

  // Security / Auto-Lock tab
  const [autoLockEnabled, setAutoLockEnabled] = useState(config.enabled);
  const [timeoutMinutes, setTimeoutMinutes] = useState(
    String(config.timeoutMinutes),
  );
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [autoLockSaving, setAutoLockSaving] = useState(false);
  const hasPinSet = !!config.pinHash;

  // Trash tab
  const [retentionPeriod, setRetentionPeriod] = useState("30");

  // Sync local state with config changes
  useEffect(() => {
    setAutoLockEnabled(config.enabled);
    setTimeoutMinutes(String(config.timeoutMinutes));
  }, [config.enabled, config.timeoutMinutes]);

  const handleSaveAutoLock = async () => {
    setAutoLockSaving(true);
    try {
      updateConfig({
        enabled: autoLockEnabled,
        timeoutMinutes: Number.parseInt(timeoutMinutes, 10),
      });
      toast.success("Auto-lock settings saved");
    } catch {
      toast.error("Failed to save auto-lock settings");
    } finally {
      setAutoLockSaving(false);
    }
  };

  const handleSavePin = async () => {
    if (!newPin.trim()) {
      toast.error("PIN/password cannot be empty");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("PIN/password and confirmation do not match");
      return;
    }
    if (newPin.length < 4) {
      toast.error("PIN/password must be at least 4 characters");
      return;
    }

    // If a PIN is already set, verify the current one first
    if (hasPinSet) {
      if (!currentPin.trim()) {
        toast.error("Please enter your current PIN/password to change it");
        return;
      }
      const currentHash = await hashWithSHA256(currentPin);
      if (currentHash !== config.pinHash) {
        toast.error("Current PIN/password is incorrect");
        return;
      }
    }

    setPinSaving(true);
    try {
      const hash = await hashWithSHA256(newPin);
      updateConfig({ pinHash: hash });
      setNewPin("");
      setConfirmPin("");
      setCurrentPin("");
      toast.success(
        hasPinSet
          ? "PIN/password updated successfully"
          : "PIN/password set successfully",
      );
    } catch {
      toast.error("Failed to save PIN/password");
    } finally {
      setPinSaving(false);
    }
  };

  const handleRemovePin = async () => {
    if (hasPinSet && !currentPin.trim()) {
      toast.error("Please enter your current PIN/password to remove it");
      return;
    }
    if (hasPinSet) {
      const currentHash = await hashWithSHA256(currentPin);
      if (currentHash !== config.pinHash) {
        toast.error("Current PIN/password is incorrect");
        return;
      }
    }
    updateConfig({ pinHash: null });
    setCurrentPin("");
    toast.success("PIN/password removed");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences and security settings.
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger
            value="account"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="trash"
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Trash</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Account Tab ── */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Update your display name and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <Button onClick={() => toast.success("Account settings saved")}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance Tab ── */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Choose how the application looks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        theme === value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control which notifications you receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  id: "email-notif",
                  label: "Email Notifications",
                  desc: "Receive notifications via email",
                  value: emailNotifications,
                  onChange: setEmailNotifications,
                },
                {
                  id: "push-notif",
                  label: "Push Notifications",
                  desc: "Receive browser push notifications",
                  value: pushNotifications,
                  onChange: setPushNotifications,
                },
                {
                  id: "activity-alerts",
                  label: "Activity Alerts",
                  desc: "Get notified about file activity",
                  value: activityAlerts,
                  onChange: setActivityAlerts,
                },
                {
                  id: "storage-warnings",
                  label: "Storage Warnings",
                  desc: "Alerts when storage is running low",
                  value: storageWarnings,
                  onChange: setStorageWarnings,
                },
              ].map(({ id, label, desc, value, onChange }) => (
                <div
                  key={id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <Label htmlFor={id} className="font-medium">
                      {label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Switch id={id} checked={value} onCheckedChange={onChange} />
                </div>
              ))}
              <Button
                onClick={() => toast.success("Notification preferences saved")}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ── */}
        <TabsContent value="security" className="space-y-4">
          {/* Auto-Lock Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Auto-Lock Timeout
              </CardTitle>
              <CardDescription>
                Automatically lock your session after a period of inactivity to
                protect your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Enable/Disable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-lock-toggle" className="font-medium">
                    Enable Auto-Lock
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Lock the session automatically when inactive
                  </p>
                </div>
                <Switch
                  id="auto-lock-toggle"
                  checked={autoLockEnabled}
                  onCheckedChange={setAutoLockEnabled}
                />
              </div>

              <Separator />

              {/* Timeout duration */}
              <div className="space-y-2">
                <Label htmlFor="timeout-select">Lock After</Label>
                <Select
                  value={timeoutMinutes}
                  onValueChange={setTimeoutMinutes}
                  disabled={!autoLockEnabled}
                >
                  <SelectTrigger id="timeout-select" className="w-full sm:w-64">
                    <SelectValue placeholder="Select timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEOUT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {autoLockEnabled && timeoutMinutes !== "0"
                    ? `Session will lock after ${TIMEOUT_OPTIONS.find((o) => o.value === timeoutMinutes)?.label?.toLowerCase()} of inactivity.`
                    : autoLockEnabled
                      ? "Auto-lock is enabled but set to never lock."
                      : "Auto-lock is currently disabled."}
                </p>
              </div>

              <Button
                onClick={handleSaveAutoLock}
                disabled={autoLockSaving}
                size="sm"
              >
                {autoLockSaving ? (
                  <>Saving…</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Auto-Lock Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* PIN / Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                {hasPinSet ? "Change PIN / Password" : "Set PIN / Password"}
              </CardTitle>
              <CardDescription>
                {hasPinSet
                  ? "Update the PIN or password used to unlock your locked session."
                  : "Set a PIN or password to unlock your session when it auto-locks."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasPinSet && (
                <div className="space-y-2">
                  <Label htmlFor="current-pin">Current PIN / Password</Label>
                  <div className="relative">
                    <Input
                      id="current-pin"
                      type={showCurrentPin ? "text" : "password"}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      placeholder="Enter current PIN or password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPin((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showCurrentPin ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-pin">
                  {hasPinSet ? "New PIN / Password" : "PIN / Password"}
                </Label>
                <div className="relative">
                  <Input
                    id="new-pin"
                    type={showNewPin ? "text" : "password"}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="At least 4 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showNewPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Confirm PIN / Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-pin"
                    type={showConfirmPin ? "text" : "password"}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Repeat your PIN or password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {newPin && confirmPin && newPin !== confirmPin && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Passwords do not match
                  </p>
                )}
                {newPin &&
                  confirmPin &&
                  newPin === confirmPin &&
                  newPin.length >= 4 && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Passwords match
                    </p>
                  )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleSavePin}
                  disabled={pinSaving || !newPin || !confirmPin}
                  size="sm"
                >
                  {pinSaving ? (
                    "Saving…"
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {hasPinSet
                        ? "Update PIN / Password"
                        : "Set PIN / Password"}
                    </>
                  )}
                </Button>

                {hasPinSet && (
                  <Button
                    variant="outline"
                    onClick={handleRemovePin}
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    Remove PIN / Password
                  </Button>
                )}
              </div>

              {hasPinSet && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>
                    A PIN/password is currently set for session unlock.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Session Security
              </CardTitle>
              <CardDescription>
                Information about your current session security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">
                  Auto-Lock Status
                </span>
                <span
                  className={`text-sm font-medium ${config.enabled ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {config.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">
                  Lock Timeout
                </span>
                <span className="text-sm font-medium">
                  {config.timeoutMinutes === 0
                    ? "Never"
                    : (TIMEOUT_OPTIONS.find(
                        (o) => o.value === String(config.timeoutMinutes),
                      )?.label ?? `${config.timeoutMinutes} min`)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">
                  PIN / Password
                </span>
                <span
                  className={`text-sm font-medium ${config.pinHash ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {config.pinHash ? "Set" : "Not set"}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Trash & Recovery Tab ── */}
        <TabsContent value="trash">
          <Card>
            <CardHeader>
              <CardTitle>Trash & Recovery</CardTitle>
              <CardDescription>
                Configure how long deleted files are kept before permanent
                deletion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retention-period">
                  Default Retention Period
                </Label>
                <Select
                  value={retentionPeriod}
                  onValueChange={setRetentionPeriod}
                >
                  <SelectTrigger
                    id="retention-period"
                    className="w-full sm:w-64"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Files in trash will be permanently deleted after this period.
                </p>
              </div>
              <Button onClick={() => toast.success("Trash settings saved")}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
