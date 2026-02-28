import React from 'react';
import { Clock, LogOut, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useIsCallerApproved, useRequestApproval } from '../hooks/useQueries';
import { ApprovalStatus } from '../backend';
import { useListApprovals } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';

export default function PendingApprovalPage() {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { actor } = useActor();
  const { refetch: refetchApproval, isRefetching } = useIsCallerApproved();
  const requestApprovalMutation = useRequestApproval();

  // Try to determine if the user is rejected by checking listApprovals
  // We use a separate query to get the user's specific status
  const principalStr = identity?.getPrincipal().toString();

  // Check approval status from the list (if accessible)
  const { data: approvals } = useListApprovals();
  const userApproval = approvals?.find(
    (a) => a.principal.toString() === principalStr
  );

  const isRejected = userApproval?.status === ApprovalStatus.rejected;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleRefresh = async () => {
    await refetchApproval();
  };

  const handleRequestApproval = async () => {
    try {
      await requestApprovalMutation.mutateAsync();
    } catch {
      // Silently handle - user may already have requested
    }
  };

  if (isRejected) {
    return <RejectedView onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CloudStorage</h1>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-xl">Account Pending Approval</CardTitle>
            <CardDescription className="text-base mt-2">
              Your registration is complete. An administrator needs to review and approve your
              account before you can access the application.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">What happens next?</p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  An administrator will review your account request
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  You will be notified once your account is approved
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  After approval, you can log in and access all features
                </li>
              </ul>
            </div>

            {principalStr && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Your account ID</p>
                <p className="text-xs font-mono text-foreground break-all">{principalStr}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRefresh}
                disabled={isRefetching}
              >
                {isRefetching ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Checking status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Approval Status
                  </>
                )}
              </Button>

              {!userApproval && (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleRequestApproval}
                  disabled={requestApprovalMutation.isPending}
                >
                  {requestApprovalMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Submitting request...
                    </>
                  ) : (
                    'Submit Approval Request'
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}

function RejectedView({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-4">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CloudStorage</h1>
        </div>

        <Card className="border-destructive/30 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl">Account Access Denied</CardTitle>
            <CardDescription className="text-base mt-2">
              Your account request was reviewed and was not approved by an administrator.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                If you believe this is a mistake, please contact your system administrator for
                assistance.
              </p>
            </div>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
