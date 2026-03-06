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
import { useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  HardDrive,
  Loader2,
  LogOut,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsCallerApproved } from "../hooks/useQueries";

export default function WaitingApproval() {
  const { clear, identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  const {
    data: isApproved,
    isLoading: approvalLoading,
    refetch: refetchApproval,
  } = useIsCallerApproved();

  // Registration form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Check localStorage to see if this user already submitted a registration request
  const principalKey = identity
    ? `approval_submitted_${identity.getPrincipal().toString()}`
    : null;

  useEffect(() => {
    if (principalKey && localStorage.getItem(principalKey)) {
      setHasSubmitted(true);
    }
  }, [principalKey]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!actor || actorFetching) {
      toast.error("Not connected to backend yet. Please wait.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Initialize this user in accessControl as a regular user
      // This is required so saveCallerUserProfile (which needs #user role) works
      try {
        await actor._initializeAccessControlWithSecret("CAFFEINE_ADMIN_SECRET");
      } catch {
        // May already be initialized — continue
      }

      // Small delay to ensure state propagation
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 2: Save profile so admin can see name/email
      try {
        await actor.saveCallerUserProfile({
          name: name.trim(),
          email: email.trim(),
        });
      } catch (profileErr) {
        // Profile save failed — log but continue with approval request
        console.warn("Could not save profile during registration:", profileErr);
      }

      // Step 3: Request approval
      await actor.requestApproval();

      // Mark as submitted in localStorage
      if (principalKey) {
        localStorage.setItem(principalKey, "1");
      }
      setHasSubmitted(true);
      toast.success("Registration request submitted!");

      // Invalidate queries so fresh data is fetched
      queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    } catch (err) {
      toast.error(
        `Failed to submit registration: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleRefresh = () => {
    refetchApproval();
  };

  // Since the backend only exposes isCallerApproved (boolean), treat not-approved as pending
  const isPending = !isApproved;
  const isRejected = false;

  if (approvalLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">
            Checking approval status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Header branding */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <HardDrive className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight">CloudStorage</span>
      </div>

      {/* Registration form — shown only for first-time users who haven't submitted yet */}
      {!hasSubmitted && isPending && !isRejected ? (
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">Request Access</CardTitle>
            <CardDescription className="text-sm mt-2 leading-relaxed">
              Enter your details to request access. An administrator will review
              your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name *</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  disabled={isSubmitting}
                  data-ocid="registration.input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !name.trim() || actorFetching}
                data-ocid="registration.submit_button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Request Access"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              {isPending && !isRejected ? (
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
              )}
            </div>

            <CardTitle className="text-xl">
              {isPending && !isRejected
                ? "Registration Pending Approval"
                : "Registration Not Approved"}
            </CardTitle>

            <CardDescription className="text-sm mt-2 leading-relaxed">
              {isPending && !isRejected ? (
                <>
                  Your registration request has been submitted and is awaiting
                  review by an administrator. You will gain access once your
                  account is approved.
                </>
              ) : (
                <>
                  Unfortunately, your registration request was not approved.
                  Please contact an administrator if you believe this is a
                  mistake.
                </>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            {isPending && !isRejected && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Your request is in the queue. An admin will review it
                    shortly. You can check back later by refreshing this page.
                  </span>
                </div>
              </div>
            )}

            {isPending && !isRejected && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRefresh}
                disabled={approvalLoading}
                data-ocid="waiting.refresh_button"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Approval Status
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="mt-8 text-xs text-muted-foreground text-center">
        Built with <span className="text-red-500">♥</span> using{" "}
        <a
          href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
