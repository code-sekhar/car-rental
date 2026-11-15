import { Suspense } from "react";
import { TokenForm } from "@/components/auth/token-form";
export const metadata = {
  title: "verify-email",
  robots: { index: false, follow: false },
};
async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" && raw.length === 64 ? raw : "";
  return <TokenForm token={token} kind="verify-email" />;
}
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main id="main-content" className="auth-page">
      <div className="auth-card auth-content">
        <Suspense fallback={<p>Loading secure form…</p>}>
          <Content {...props} />
        </Suspense>
      </div>
    </main>
  );
}
