"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth";

interface SignInFormValues {
  email: string;
  password: string;
}

export function SignInForm() {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>();

  async function onSubmit({ email, password }: SignInFormValues) {
    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/",
    });

    if (error) {
      const message = error.message || "The email or password is incorrect.";

      setError("root.server", {
        message,
      });
      toast.add({
        type: "error",
        title: "Sign in failed",
        description: message,
      });
      return;
    }

    toast.add({
      type: "success",
      title: "Signed in",
      description: "Welcome back. Redirecting to your workspace.",
    });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          Welcome back
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Sign in to your workspace.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Keep your team, contacts, and invoices moving in one place.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Login ID</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              aria-invalid={!!errors.email}
              {...register("email", {
                required: "Enter your email address.",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address.",
                },
              })}
              className="h-11 rounded-md px-3"
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <div className="flex items-center justify-between gap-4">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <InputGroup className="h-11 rounded-md">
              <InputGroupInput
                id="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={!!errors.password}
                {...register("password", {
                  required: "Enter your password.",
                })}
                className="h-10 px-3"
              />
              <InputGroupButton
                type="button"
                size="icon-sm"
                aria-label={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
                aria-pressed={isPasswordVisible}
                title={isPasswordVisible ? "Hide password" : "Show password"}
                onClick={() => setIsPasswordVisible((visible) => !visible)}
              >
                {isPasswordVisible ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroup>
            <FieldError errors={[errors.password]} />
          </Field>
        </FieldGroup>

        {errors.root?.server ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.root.server.message}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-md"
        >
          {isSubmitting ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : null}
          {isSubmitting ? "Signing in..." : "Sign in"}
          {!isSubmitting ? <ArrowRight data-icon="inline-end" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-foreground hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
