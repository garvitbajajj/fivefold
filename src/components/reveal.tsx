"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades and lifts its children the first time they scroll into view.
 *
 * Fifteen lines of IntersectionObserver instead of an animation library: the
 * brief asks for subtle motion, not orchestration, and CSS already does the
 * easing. Honours prefers-reduced-motion through the global rule in
 * globals.css, which collapses the animation to nothing.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={
        shown
          ? { animation: `var(--animate-rise)`, animationDelay: `${delay}ms` }
          : { opacity: 0 }
      }
    >
      {children}
    </div>
  );
}
