"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

import { authClient } from "@/lib/auth";
import api from "@/lib/axios";
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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

interface InvitationData {
  id: string;
  email: string;
  role?: string;
  status: string;
  organizationId: string;
  organizationName?: string;
  organizationSlug?: string;
  inviterEmail?: string;
  inviterName?: string;
  expiresAt?: string | Date;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("id");

  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Form states
  const [isExistingAccountMode, setIsExistingAccountMode] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepStatus, setStepStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Fetch invitation metadata on load
  useEffect(() => {
    async function loadInvitation() {
      if (!invitationId) {
        setInviteError(
          "Missing invitation ID. Please check the link in your invitation email.",
        );
        setIsLoadingInvite(false);
        return;
      }

      try {
        const { data } = await api.get<InvitationData>(
          `/api/contacts/public-invitation?id=${encodeURIComponent(invitationId)}`,
        );

        if (!data) {
          setInviteError(
            "This invitation link is invalid, expired, or has already been accepted.",
          );
          setIsLoadingInvite(false);
          return;
        }

        const inv = data;

        // Verify status
        if (inv.status && inv.status !== "pending") {
          setInviteError(
            `This invitation has already been ${inv.status}. If you already have an account, please sign in.`,
          );
          setIsLoadingInvite(false);
          return;
        }

        // Verify expiration
        if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
          setInviteError(
            "This invitation has expired. Please contact the administrator to request a new invitation.",
          );
          setIsLoadingInvite(false);
          return;
        }

        setInvitation(inv);
      } catch (err: any) {
        setInviteError(
          err?.response?.data?.error ||
            err?.message ||
            "This invitation link is invalid, expired, or has already been accepted.",
        );
      } finally {
        setIsLoadingInvite(false);
      }
    }

    loadInvitation();
  }, [invitationId]);

  // 2. Multi-step submission sequence
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!invitation || !invitationId) return;

    if (!password) {
      setFormError("Password is required.");
      return;
    }

    if (!isExistingAccountMode) {
      if (password.length < 8) {
        setFormError("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const email = invitation.email.trim().toLowerCase();

      // Step 4a: Create user account or sign in with existing password
      if (!isExistingAccountMode) {
        setStepStatus("Creating your account...");
        const derivedName = email.split("@")[0];

        const signUpRes = await authClient.signUp.email({
          email,
          password,
          name: derivedName,
        });

        if (signUpRes?.error) {
          const errMsg = signUpRes.error.message || "";
          // Check for existing account edge case
          if (
            errMsg.toLowerCase().includes("already exists") ||
            errMsg.toLowerCase().includes("user already") ||
            errMsg.toLowerCase().includes("unique constraint")
          ) {
            setIsExistingAccountMode(true);
            setFormError(
              "An account with this email already exists. Please enter your existing password to accept the invitation.",
            );
            setIsSubmitting(false);
            setStepStatus(null);
            return;
          }

          throw new Error(errMsg || "Failed to create account credentials.");
        }
      } else {
        setStepStatus("Signing in to existing account...");
        const signInRes = await authClient.signIn.email({
          email,
          password,
        });

        if (signInRes?.error) {
          throw new Error(
            signInRes.error.message ||
              "Invalid password. Please check your password and try again.",
          );
        }
      }

      // Step 4b: Accept organization invitation
      setStepStatus("Accepting organization invitation...");
      const acceptRes = await authClient.organization.acceptInvitation({
        invitationId,
      });

      if (acceptRes?.error) {
        throw new Error(
          acceptRes.error.message ||
            "Failed to accept organization invitation. The invitation may have expired.",
        );
      }

      // Ensure active organization is set
      try {
        await authClient.organization.setActive({
          organizationId: invitation.organizationId || "org_urban_furniture",
        });
      } catch {
        // Non-fatal if organization was auto-activated
      }

      // Step 4c: Bridge Better Auth user ID to matching Contact record
      setStepStatus("Linking contact portal profile...");
      const linkRes = await api.post("/api/contacts/link-user");

      if (!linkRes.data?.success) {
        throw new Error(
          linkRes.data?.error ||
            "Account created, but failed to link your contact record. Please notify support.",
        );
      }

      toast.success("Welcome to Urban Furniture!", {
        description: "Your portal account has been activated successfully.",
      });

      // Step 5: Redirect to portal invoices
      setStepStatus("Redirecting to your portal...");
      router.replace("/portal/invoices");
      router.refresh();
    } catch (err: any) {
      console.error("Accept invitation failure:", err);
      setFormError(
        err?.message ||
          "An unexpected error occurred during setup. Please try again.",
      );
      setStepStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoadingInvite) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Validating your portal invitation...
        </p>
      </div>
    );
  }

  // Invalid / Expired invitation state
  if (inviteError || !invitation) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <ShieldAlert className="size-10" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Invitation Invalid or Expired
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {inviteError ||
            "We could not locate or verify this invitation. It may have expired or already been accepted."}
        </p>
        <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
          <Button nativeButton={false} render={<Link href="/signin" />}>
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-10">
      {/* ─── Invitation Header Card ─── */}
      <Card className="border border-border/80 shadow-md">
        <CardHeader className="text-center pb-4 border-b">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Join {invitation.organizationName || "Urban Furniture"}
          </CardTitle>
          <CardDescription className="text-xs">
            You've been invited by{" "}
            <strong>{invitation.inviterName || "Urban Furniture Admin"}</strong>{" "}
            to access the Customer & Vendor Portal.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Inline Error Notice */}
            {formError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Step Progress Notice */}
            {stepStatus && (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary flex items-center gap-2">
                <Spinner className="size-3.5 shrink-0" />
                <span>{stepStatus}</span>
              </div>
            )}

            {/* Email Address (Pre-filled and Locked) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="invitedEmail" className="text-xs font-semibold">
                  Invited Email
                </Label>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle2 className="size-3" />
                  Verified Link
                </span>
              </div>
              <div className="relative">
                <Input
                  id="invitedEmail"
                  value={invitation.email}
                  disabled
                  className="bg-muted/50 text-muted-foreground font-mono text-xs pr-10"
                />
                <Lock className="absolute right-3 top-2.5 size-4 text-muted-foreground/60" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                This account will be linked to your business records.
              </p>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="accountPassword" className="text-xs font-semibold">
                {isExistingAccountMode
                  ? "Enter Existing Password"
                  : "Create Password"}
              </Label>
              <div className="relative">
                <Input
                  id="accountPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isExistingAccountMode
                      ? "Your account password"
                      : "Minimum 8 characters"
                  }
                  disabled={isSubmitting}
                  className="pr-10"
                  autoComplete={
                    isExistingAccountMode ? "current-password" : "new-password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password (only in new registration mode) */}
            {!isExistingAccountMode && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmAccountPassword"
                  className="text-xs font-semibold"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmAccountPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    disabled={isSubmitting}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Existing Account Toggle Helper */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setIsExistingAccountMode((prev) => !prev);
                  setFormError(null);
                }}
                className="text-xs text-primary hover:underline"
              >
                {isExistingAccountMode
                  ? "Need to create a new password? Switch to sign up"
                  : "Already have a password? Sign in instead"}
              </button>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="size-4" />
                    Setting Up Portal Access...
                  </>
                ) : (
                  <>
                    <UserCheck className="size-4" />
                    {isExistingAccountMode
                      ? "Sign In & Accept Invitation"
                      : "Create Account & Enter Portal"}
                    <ArrowRight className="size-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
            <Spinner className="size-8 text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Loading invitation...
            </p>
          </div>
        }
      >
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
