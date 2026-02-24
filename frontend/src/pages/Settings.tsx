import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from 'next-themes';
import {
  useGetCallerUserProfile,
  useGetTrashRetentionPeriod,
  useSetUserRetentionPeriod,
} from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Moon, Sun, Monitor } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: retentionPeriod } = useGetTrashRetentionPeriod();
  const setRetentionPeriod = useSetUserRetentionPeriod();
  const { identity } = useInternetIdentity();

  const [selectedRetention, setSelectedRetention] = useState<string>('30');

  const currentRetentionDays = retentionPeriod
    ? Math.round(Number(retentionPeriod) / (1000000000 * 60 * 60 * 24))
    : 30;

  const handleRetentionChange = async (days: string) => {
    setSelectedRetention(days);
    if (!identity) return;

    try {
      const daysNum = parseInt(days);
      const periodNanoseconds = BigInt(daysNum * 24 * 60 * 60 * 1000000000);
      await setRetentionPeriod.mutateAsync({
        user: identity.getPrincipal(),
        retentionPeriod: periodNanoseconds,
      });
      toast.success(`Trash retention period updated to ${days} days`);
    } catch (error) {
      toast.error('Failed to update retention period');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {userProfile?.name || 'Not set'}
              </p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {userProfile?.email || 'Not set'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trash & Recovery</CardTitle>
            <CardDescription>Configure trash retention settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="retention">Trash Retention Period</Label>
              <Select
                value={currentRetentionDays.toString()}
                onValueChange={handleRetentionChange}
              >
                <SelectTrigger id="retention">
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Files in Trash will be automatically deleted after this period
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how CloudStorage looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Theme</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>File Upload Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when files finish uploading
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Storage Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when storage is running low
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-12 pt-6 border-t border-border text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} CloudStorage. Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              window.location.hostname
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
