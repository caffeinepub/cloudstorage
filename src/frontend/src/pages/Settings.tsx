import { useState } from 'react';
import { useGetCallerUserProfile, useGetUserRetentionPeriod, useSetUserRetentionPeriod } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

export default function Settings() {
  const { data: profile } = useGetCallerUserProfile();
  const { data: retentionPeriod } = useGetUserRetentionPeriod();
  const setRetentionPeriod = useSetUserRetentionPeriod();
  const { identity, clear } = useInternetIdentity();
  const { theme, setTheme } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleRetentionChange = async (days: string) => {
    if (!identity) return;
    
    const daysNum = parseInt(days);
    const periodNanoseconds = BigInt(daysNum * 24 * 60 * 60 * 1000000000);
    
    try {
      await setRetentionPeriod.mutateAsync({
        user: identity.getPrincipal(),
        period: periodNanoseconds,
      });
      toast.success('Retention period updated');
    } catch (error) {
      toast.error('Failed to update retention period');
    }
  };

  const handleLogout = async () => {
    await clear();
    toast.success('Logged out successfully');
  };

  const retentionDays = retentionPeriod 
    ? Math.floor(Number(retentionPeriod) / (24 * 60 * 60 * 1000000000))
    : 30;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={profile?.name || ''} disabled className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled className="mt-1" />
            </div>
            <div>
              <Label>Principal ID</Label>
              <Input 
                value={identity?.getPrincipal().toString() || ''} 
                disabled 
                className="mt-1 font-mono text-xs" 
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Trash Settings</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="retention">Trash Retention Period</Label>
              <Select 
                value={retentionDays.toString()} 
                onValueChange={handleRetentionChange}
              >
                <SelectTrigger id="retention" className="mt-1">
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
              <p className="text-sm text-muted-foreground mt-1">
                Files in trash will be permanently deleted after this period
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about file activities
                </p>
              </div>
              <Switch 
                checked={notificationsEnabled} 
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for important events
                </p>
              </div>
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={setEmailNotifications}
                disabled={!notificationsEnabled}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch 
                checked={twoFactorEnabled} 
                onCheckedChange={setTwoFactorEnabled}
              />
            </div>
            <Separator />
            <div>
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
