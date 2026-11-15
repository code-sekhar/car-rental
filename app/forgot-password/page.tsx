import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Forgot Password" };
export default function Forgot() {
  return (
    <main id="main-content" className="auth-page">
      <div className="auth-card auth-content">
        <AuthForm initialMode="forgot" />
      </div>
    </main>
  );
}
