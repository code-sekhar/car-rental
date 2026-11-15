import { AuthForm } from "@/components/auth/auth-form";
export const metadata = { title: "Create an Account" };
export default function Register() {
  return (
    <main id="main-content" className="auth-page">
      <div className="auth-card auth-content">
        <AuthForm initialMode="signup" />
      </div>
    </main>
  );
}
