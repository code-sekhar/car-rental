import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Sign In" };
export default function Login() {
  return (
    <main id="main-content" className="auth-page">
      <div className="auth-card auth-content">
        <AuthForm
          googleEnabled={Boolean(
            process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
          )}
        />
      </div>
    </main>
  );
}
