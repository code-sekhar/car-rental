import { Suspense } from "react";
import { connection } from "next/server";
import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Sign In" };
async function Content({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  await connection();
  const { returnTo } = await searchParams;
  const redirectTo =
    typeof returnTo === "string" &&
    /^\/booking\/(new|[a-zA-Z0-9_-]+)(\?[^\\]*)?$/.test(returnTo)
      ? returnTo
      : "/dashboard";
  return (
    <AuthForm
      redirectTo={redirectTo}
      googleEnabled={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
    />
  );
}
export default function Login(props: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  return (
    <main id="main-content" className="auth-page">
      <div className="auth-card auth-content">
        <Suspense
          fallback={<div className="skeleton" aria-label="Loading sign in" />}
        >
          <Content {...props} />
        </Suspense>
      </div>
    </main>
  );
}
