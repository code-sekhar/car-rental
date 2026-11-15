"use client";
import { signOut } from "next-auth/react";
export function SignOutButton() {
  return (
    <button
      className="button button-outline"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign Out
    </button>
  );
}
