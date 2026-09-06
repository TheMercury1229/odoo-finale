import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata: Metadata = {
  title: "Account Profile - Urban Furniture",
  description:
    "Manage your profile, security credentials, and view active session details.",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <ProfileView />
      </main>
    </div>
  );
}
