"use client";
import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
const key = "veltrix-preview-shortlist";
const event = "veltrix-shortlist-change";
let fallback = "";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(event, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(event, callback);
  };
}
function snapshot() {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return fallback;
  }
}
const serverSnapshot = () => "";
export function ShortlistButton({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const saved = stored.split(",").includes(slug);
  function toggle() {
    const slugs = new Set(snapshot().split(",").filter(Boolean));
    if (slugs.has(slug)) slugs.delete(slug);
    else slugs.add(slug);
    fallback = [...slugs].join(",");
    try {
      window.localStorage.setItem(key, fallback);
    } catch {
      /* A browser with storage disabled retains an in-memory shortlist. */
    }
    window.dispatchEvent(new Event(event));
  }
  return (
    <button
      type="button"
      className={`shortlist-button ${saved ? "is-saved" : ""}`}
      aria-label={`${saved ? "Remove" : "Add"} ${name} ${saved ? "from" : "to"} browser shortlist`}
      aria-pressed={saved}
      title="Saved only in this browser"
      onClick={toggle}
    >
      <Heart size={17} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
