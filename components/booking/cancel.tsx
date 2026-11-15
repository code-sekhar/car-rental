"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function CancelBooking({ id }: { id: string }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await fetch(`/api/bookings/${id}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          });
          const body = await r.json();
          if (!r.ok) throw new Error(body.error);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to cancel.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Cancel or Request Cancellation</h2>
      <p>
        Unpaid drafts and holds are cancelled immediately. Paid or active
        rentals require review; refunds are not automatic.
      </p>
      <label>
        Cancellation reason
        <textarea
          required
          minLength={5}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <button className="button button-dark" disabled={busy}>
        {busy ? "Submitting…" : "Submit Cancellation"}
      </button>
    </form>
  );
}
