import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();
const allowedRoles = new Set(["admin", "accountant", "contact"]);

type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
};

async function getAuthenticatedUser(req: Request) {
  const authUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000";
  const cookie = req.headers.get("cookie");

  if (!cookie) return null;

  const response = await fetch(`${authUrl}/api/auth/get-session`, {
    headers: { cookie },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { user?: AuthenticatedUser };
  const user = payload.user;

  if (!user || !allowedRoles.has(user.role || "")) return null;

  return user;
}

export const ourFileRouter = {
  imageUploader: f(
    {
      image: {
        maxFileSize: "8MB",
        maxFileCount: 1,
      },
    },
    { awaitServerData: false },
  )
    .middleware(async ({ req }) => {
      const user = await getAuthenticatedUser(req);

      if (!user) {
        throw new UploadThingError("Unauthorized");
      }

      return {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      uploadedBy: metadata.userId,
      uploadedByName: metadata.userName,
      uploadedByRole: metadata.userRole,
      url: file.ufsUrl,
      key: file.key,
      name: file.name,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
