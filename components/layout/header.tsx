"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LockKeyhole, Menu, UserRound, X } from "lucide-react";
import { Logo } from "./logo";
import { useSession, signOut } from "next-auth/react";
import { AuthForm } from "@/components/auth/auth-form";

export function Header({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const { data: session } = useSession();
  const [mobile, setMobile] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [dialogVersion, setDialogVersion] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  function open(next: "signin" | "signup") {
    setMode(next);
    setDialogVersion((value) => value + 1);
    dialog.current?.showModal();
  }
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <button
            className="icon-button mobile-toggle"
            aria-label={mobile ? "Close navigation" : "Open navigation"}
            aria-expanded={mobile}
            aria-controls="main-nav"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
          <nav
            id="main-nav"
            aria-label="Main navigation"
            className={mobile ? "main-nav is-open" : "main-nav"}
          >
            <Link href="/" onClick={() => setMobile(false)}>
              Home
            </Link>
            <details className="nav-dropdown">
              <summary>
                Listing <ChevronDown size={13} />
              </summary>
              <div>
                <Link href="/cars" onClick={() => setMobile(false)}>
                  Explore cars
                </Link>
                <Link
                  href="/cars?category=SUV"
                  onClick={() => setMobile(false)}
                >
                  SUVs & family cars
                </Link>
                <Link
                  href="/cars?category=Sports"
                  onClick={() => setMobile(false)}
                >
                  Sports cars
                </Link>
              </div>
            </details>
            <details className="nav-dropdown">
              <summary>
                Users <ChevronDown size={13} />
              </summary>
              <div>
                {session?.user ? (
                  <>
                    <Link href="/dashboard" onClick={() => setMobile(false)}>
                      My Account
                    </Link>
                    {session.user.role === "ADMIN" && (
                      <Link href="/admin" onClick={() => setMobile(false)}>
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMobile(false);
                        void signOut({ callbackUrl: "/" });
                      }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMobile(false);
                        open("signin");
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobile(false);
                        open("signup");
                      }}
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </details>
            <details className="nav-dropdown">
              <summary>
                Pages <ChevronDown size={13} />
              </summary>
              <div>
                <Link href="/#how-it-works" onClick={() => setMobile(false)}>
                  How It Works
                </Link>
                <Link href="/#faq" onClick={() => setMobile(false)}>
                  FAQs
                </Link>
                <Link href="/#rental-info" onClick={() => setMobile(false)}>
                  Rental Plans
                </Link>
              </div>
            </details>
            <Link href="/#journal" onClick={() => setMobile(false)}>
              Blog
            </Link>
            <Link href="/#contact" onClick={() => setMobile(false)}>
              Contact
            </Link>
          </nav>
          <div className="header-actions">
            <span className="locale">
              English <ChevronDown size={12} />
            </span>
            <span className="locale">
              USD <ChevronDown size={12} />
            </span>
            <span className="header-divider" />
            {session?.user ? (
              <>
                <Link href="/dashboard" className="button button-dark">
                  <UserRound size={16} /> My Account
                </Link>
                <button
                  className="button button-primary"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  className="button button-dark"
                  onClick={() => open("signin")}
                >
                  <UserRound size={16} /> Sign In
                </button>
                <button
                  className="button button-primary"
                  onClick={() => open("signup")}
                >
                  <LockKeyhole size={16} /> Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <dialog
        ref={dialog}
        aria-labelledby="auth-title"
        className="auth-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="auth-content">
          <button
            className="icon-button dialog-close"
            aria-label="Close sign in"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
          <AuthForm
            key={`${mode}-${dialogVersion}`}
            initialMode={mode}
            googleEnabled={googleEnabled}
            onSuccess={() => dialog.current?.close()}
          />
        </div>
      </dialog>
    </>
  );
}
