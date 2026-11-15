"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetSchema, verifySchema } from "@/lib/auth/validation";
import { LoaderCircle } from "lucide-react";
export function TokenForm({
  token,
  kind,
}: {
  token: string;
  kind: "verify-email" | "reset-password";
}) {
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState("");
  const schema = kind === "reset-password" ? resetSchema : verifySchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ token: string; password?: string }>({
    resolver: zodResolver(schema),
    defaultValues: { token },
  });
  async function submit(data: { token: string; password?: string }) {
    setFailure("");
    try {
      const response = await fetch(`/api/account/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        setFailure(result.error ?? "This link could not be used.");
        return;
      }
      setSuccess(result.message);
    } catch {
      setFailure("The service is unavailable. Please try again.");
    }
  }
  return (
    <div className="auth-form-wrap">
      <h2>
        {kind === "verify-email"
          ? "Verify your email"
          : "Choose a new password"}
      </h2>
      <p>
        {kind === "verify-email"
          ? "Confirm your email to activate your Veltrix account."
          : "Use at least 12 characters, including uppercase, lowercase and a number."}
      </p>
      {failure && (
        <p className="auth-feedback auth-feedback-error" role="alert">
          {failure}
        </p>
      )}
      {success ? (
        <>
          <p className="auth-feedback" role="status">
            {success}
          </p>
          <Link className="button button-dark w-full" href="/login">
            Continue to sign in
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit(submit)} noValidate>
          <input type="hidden" {...register("token")} />
          {errors.token && (
            <p className="field-error" role="alert">
              This link is invalid. Request a new email.
            </p>
          )}
          {kind === "reset-password" && (
            <label>
              New password
              <input
                type="password"
                {...register("password")}
                autoComplete="new-password"
              />
              {errors.password && (
                <small className="field-error" role="alert">
                  {errors.password.message}
                </small>
              )}
            </label>
          )}
          <button
            className="button button-dark w-full"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="spin" size={18} />
                Please wait…
              </>
            ) : kind === "verify-email" ? (
              "Verify email"
            ) : (
              "Reset password"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
