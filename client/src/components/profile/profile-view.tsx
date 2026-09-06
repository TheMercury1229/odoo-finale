"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";

import { authClient } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useUploadThing } from "@/lib/uploadthing";

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleLabel(role?: string | null) {
  if (role === "admin") return "Administrator";
  if (role === "accountant") return "Accountant";
  if (role === "contact") return "Portal Contact";
  return role || "User";
}

export function ProfileView() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  // Active tab state: "general" | "security"
  const [activeTab, setActiveTab] = useState<"general" | "security">("general");

  // Profile form state
  const [name, setName] = useState("");
  const [isNameInitialized, setIsNameInitialized] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sync initial user details
  if (user && !isNameInitialized) {
    setName(user.name || "");
    setAvatarUrl(user.image || null);
    setIsNameInitialized(true);
  }

  // Upload avatar with uploadthing
  const { startUpload, isUploading: isUploadingAvatar } = useUploadThing(
    "imageUploader",
    {
      onClientUploadComplete: async (res) => {
        const file = res?.[0];
        const uploadedUrl = file?.ufsUrl || file?.url || file?.appUrl;
        if (uploadedUrl) {
          setAvatarUrl(uploadedUrl);
          try {
            await authClient.updateUser({
              image: uploadedUrl,
            });
            toast.success("Avatar updated", {
              description: "Your new profile picture has been saved.",
            });
          } catch (err: any) {
            toast.error("Failed to save avatar", {
              description: err?.message || "Please try again.",
            });
          }
        }
      },
      onUploadError: (err) => {
        toast.error("Avatar upload failed", {
          description: err.message || "Failed to upload image.",
        });
      },
    },
  );

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const res = await authClient.updateUser({
        name: name.trim(),
      });

      if (res?.error) {
        toast.error("Update failed", {
          description: res.error.message || "Could not update profile.",
        });
        return;
      }

      toast.success("Profile updated", {
        description: "Your display name has been successfully updated.",
      });
      router.refresh();
    } catch (err: any) {
      toast.error("Update failed", {
        description: err?.message || "An unexpected error occurred.",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password too short", {
        description: "New password must be at least 8 characters long.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match", {
        description: "New password and confirmation must match exactly.",
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });

      if (res?.error) {
        toast.error("Password change failed", {
          description:
            res.error.message ||
            "Please check your current password and try again.",
        });
        return;
      }

      toast.success("Password updated", {
        description: "Your password has been changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error("Password change failed", {
        description: err?.message || "An unexpected error occurred.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.replace("/signin");
      router.refresh();
    } catch {
      router.replace("/signin");
    }
  };

  const isContactRole = user?.role === "contact";
  const backRoute = isContactRole ? "/portal/invoices" : "/contacts";
  const backLabel = isContactRole ? "Back to Portal" : "Back to Dashboard";

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading your account profile...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold">Session Expired or Not Found</h2>
        <p className="text-sm text-muted-foreground">
          Please sign in to view and manage your profile.
        </p>
        <Button onClick={() => router.push("/signin")} className="mt-2">
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-1 flex-col gap-6 pb-16">
      {/* ─── Top Navigation & Action Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(backRoute)}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Button>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* ─── Hero User Card ─── */}
      <Card className="border border-border/80 bg-card shadow-xs">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar with Upload Hover */}
            <div className="relative group shrink-0">
              <Avatar className="size-20 border-2 border-primary/20 shadow-sm">
                <AvatarImage
                  src={avatarUrl || undefined}
                  alt={user.name || "User Avatar"}
                />
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              {/* Upload trigger overlay */}
              <label
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                title="Change profile picture"
              >
                {isUploadingAvatar ? (
                  <Spinner className="size-5 text-white" />
                ) : (
                  <Camera className="size-5 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={isUploadingAvatar}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) startUpload([file]);
                  }}
                />
              </label>
            </div>

            {/* Basic Info */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {user.name || "User Profile"}
                </h1>
                {user.role === "admin" && (
                  <Badge className="bg-purple-600 hover:bg-purple-700 text-white gap-1 font-medium">
                    <ShieldAlert className="size-3" /> Admin
                  </Badge>
                )}
                {user.role === "accountant" && (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 font-medium">
                    <Shield className="size-3" /> Accountant
                  </Badge>
                )}
                {user.role === "contact" && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-medium">
                    <Building2 className="size-3" /> Portal Contact
                  </Badge>
                )}
              </div>

              <p className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Profile Navigation Tabs (Clean Border Line Pattern) ─── */}
      <div className="border-b border-border/70">
        <nav className="flex items-center gap-6" aria-label="Profile Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`group inline-flex items-center gap-2 pb-3.5 pt-1 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <User
              className={`size-4 transition-colors ${
                activeTab === "general"
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              }`}
            />
            <span>General Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`group inline-flex items-center gap-2 pb-3.5 pt-1 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === "security"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <KeyRound
              className={`size-4 transition-colors ${
                activeTab === "security"
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              }`}
            />
            <span>Security & Password</span>
          </button>
        </nav>
      </div>

      {/* ─── Tab Content: General Info ─── */}
      {activeTab === "general" && (
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="size-4 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your display name. Click your avatar photo above to upload a new profile picture.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleUpdateName} className="space-y-5 max-w-md">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  disabled={isUpdatingProfile}
                />
              </div>

              {/* Email (Read-Only) */}
              <div className="space-y-2">
                <Label htmlFor="displayEmail" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="displayEmail"
                    value={user.email}
                    disabled
                    className="bg-muted/50 text-muted-foreground pr-10"
                  />
                  <Lock className="absolute right-3 top-2.5 size-4 text-muted-foreground/60" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email is managed by your organization and cannot be changed here.
                </p>
              </div>

              {/* Role (Read-Only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Account Role
                </Label>
                <Input
                  value={getRoleLabel(user.role)}
                  disabled
                  className="bg-muted/50 text-muted-foreground"
                />
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isUpdatingProfile || isUploadingAvatar}
                  className="gap-2"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Spinner className="size-4" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── Tab Content: Security & Password ─── */}
      {activeTab === "security" && (
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>
              Ensure your account is protected with a secure password.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form
              onSubmit={handleChangePassword}
              className="space-y-4 max-w-md"
            >
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPasswordInput" className="text-sm font-medium">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPasswordInput"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    disabled={isChangingPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPasswordInput" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPasswordInput"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    disabled={isChangingPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPasswordInput" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPasswordInput"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    disabled={isChangingPassword}
                    className="pr-10"
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

              {/* Revoke other sessions checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="revokeOtherSessionsCheck"
                  checked={revokeOtherSessions}
                  onChange={(e) => setRevokeOtherSessions(e.target.checked)}
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <Label
                  htmlFor="revokeOtherSessionsCheck"
                  className="text-xs font-normal text-muted-foreground cursor-pointer"
                >
                  Log out of other active sessions and devices
                </Label>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="gap-2"
                >
                  {isChangingPassword ? (
                    <>
                      <Spinner className="size-4" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="size-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
