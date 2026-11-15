"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LoaderCircle, CheckCircle2 } from "lucide-react";
import { emailSchema, passwordSchema } from "@/lib/auth/validation";
type Mode = "signin" | "signup" | "forgot" | "resend";
export function AuthForm({
  initialMode = "signin",
  googleEnabled = false,
  onSuccess,
}: {
  initialMode?: Mode;
  googleEnabled?: boolean;
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [visible, setVisible] = useState(false);
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const schema = z.object({
    email: emailSchema,
    name:
      mode === "signup"
        ? z.string().trim().min(2, "Enter your full name.").max(80)
        : z.string().optional(),
    password:
      mode === "signup"
        ? passwordSchema
        : mode === "signin"
          ? z.string().min(1, "Enter your password.").max(128)
          : z.string().optional(),
  });
  type Fields = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({ resolver: zodResolver(schema) });
  function change(next: Mode) {
    setMode(next);
    setFailure("");
    setSuccess("");
    reset();
  }
  async function submit(data: Fields) {
    setFailure("");
    setSuccess("");
    try {
      if (mode === "signin") {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
          callbackUrl: "/dashboard",
        });
        if (!result || result.error) {
          setFailure(
            "Check your email and password, verify your email, or try again later if you have made several attempts.",
          );
          return;
        }
        onSuccess?.();
        router.push("/dashboard");
        router.refresh();
      } else {
        const endpoint =
          mode === "signup"
            ? "register"
            : mode === "forgot"
              ? "forgot-password"
              : "resend-verification";
        const response = await fetch(`/api/account/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "signup"
              ? { name: data.name, email: data.email, password: data.password }
              : { email: data.email },
          ),
        });
        const result = await response.json();
        if (!response.ok) {
          setFailure(result.error ?? "Please try again.");
          return;
        }
        setSuccess(
          `${result.message}${result.delivery ? ` ${result.delivery}` : ""}`,
        );
      }
    } catch {
      setFailure("We couldn’t reach the service. Please try again.");
    }
  }
  const title =
    mode === "signin"
      ? "Sign In"
      : mode === "signup"
        ? "Create an account"
        : mode === "forgot"
          ? "Forgot password?"
          : "Verify your email";
  return (
    <div className="auth-form-wrap">
      <h2 id="auth-title">{title}</h2>
      <p>
        {mode === "signup"
          ? "Create your Veltrix account. We’ll email a verification link."
          : mode === "signin"
            ? "Welcome back to Veltrix Rentals."
            : "Enter your email and we’ll queue the next steps."}
      </p>
      {failure && (
        <p className="auth-feedback auth-feedback-error" role="alert">
          {failure}
        </p>
      )}
      {success && (
        <p className="auth-feedback" role="status">
          <CheckCircle2 size={18} />
          {success}
        </p>
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        {mode === "signup" && (
          <label>
            Full name <span aria-hidden="true">*</span>
            <input
              {...register("name")}
              autoComplete="name"
              placeholder="Enter your full name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "auth-name-error" : undefined}
            />
            {errors.name && (
              <small id="auth-name-error" className="field-error">
                {errors.name.message}
              </small>
            )}
          </label>
        )}
        <label>
          Email <span aria-hidden="true">*</span>
          <input
            type="email"
            aria-label="Email"
            {...register("email")}
            autoComplete="email"
            placeholder="Enter email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "auth-email-error" : undefined}
          />
          {errors.email && (
            <small id="auth-email-error" className="field-error">
              {errors.email.message}
            </small>
          )}
        </label>
        {(mode === "signin" || mode === "signup") && (
          <label>
            Password <span aria-hidden="true">*</span>
            <span className="password-field">
              <input
                type={visible ? "text" : "password"}
                aria-label="Password"
                {...register("password")}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                placeholder="Enter password"
                aria-invalid={!!errors.password}
                aria-describedby={
                  mode === "signup" ? "password-help" : undefined
                }
              />
              <button
                className="icon-button"
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
            {mode === "signup" && (
              <small id="password-help" className="form-help">
                At least 12 characters, with uppercase, lowercase and a number.
              </small>
            )}
            {errors.password && (
              <small className="field-error" role="alert">
                {errors.password.message}
              </small>
            )}
          </label>
        )}
        {mode === "signin" && (
          <div className="auth-secondary">
            <button
              type="button"
              className="text-button"
              onClick={() => change("forgot")}
            >
              Forgot password?
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => change("resend")}
            >
              Resend verification
            </button>
          </div>
        )}
        <button
          type="submit"
          className="button button-dark w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="spin" size={17} />
              Please wait…
            </>
          ) : mode === "signin" ? (
            "Sign in"
          ) : mode === "signup" ? (
            "Create account"
          ) : mode === "forgot" ? (
            "Send reset link"
          ) : (
            "Send verification link"
          )}
        </button>
      </form>
      {mode === "signin" && googleEnabled && (
        <button
          type="button"
          className="button button-outline w-full mt-3"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Continue with Google
        </button>
      )}
      <p className="auth-switch">
        {mode === "signin" ? (
          <>
            Don’t have an account?{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => change("signup")}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => change("signin")}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
