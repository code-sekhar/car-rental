"use client";
import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
export function Carousel({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  function move(direction: number) {
    const el = track.current;
    if (el)
      el.scrollBy({
        left: direction * (el.clientWidth / 3 + 12),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  return (
    <div
      className={`home-carousel ${className}`}
      role="region"
      aria-label={label}
    >
      <button
        className="carousel-arrow arrow-left"
        type="button"
        onClick={() => move(-1)}
        disabled={edge.start}
        aria-label={`Previous ${label}`}
      >
        <ArrowLeft size={19} />
      </button>
      <div
        className="carousel-track"
        ref={track}
        onScroll={() => {
          const el = track.current;
          if (el)
            setEdge({
              start: el.scrollLeft < 2,
              end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
            });
        }}
      >
        {children}
      </div>
      <button
        className="carousel-arrow arrow-right"
        type="button"
        onClick={() => move(1)}
        disabled={edge.end}
        aria-label={`Next ${label}`}
      >
        <ArrowRight size={19} />
      </button>
    </div>
  );
}
