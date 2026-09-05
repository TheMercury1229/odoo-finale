import { AuthTopbar } from "@/components/auth/auth-topbar";
import { SignInForm } from "@/components/auth/signin-form";

export default function SignInPage() {
  return (
    <main className="flex min-h-svh min-w-0 flex-col overflow-x-hidden bg-background lg:h-svh lg:overflow-hidden">
      <AuthTopbar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_42%]">
        <section className="flex min-h-0 min-w-0 items-center px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-md">
            <SignInForm />
          </div>
        </section>

        <aside className="hidden min-w-0 min-h-56 items-end bg-primary px-6 py-8 text-primary-foreground md:flex lg:min-h-0 lg:p-10">
          <div className="max-w-sm">
            <p className="mb-4 text-xs font-semibold tracking-[0.22em] uppercase opacity-75">
              One clear view
            </p>
            <p className="text-3xl font-medium leading-tight tracking-tight">
              The simple way to keep business in motion.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
