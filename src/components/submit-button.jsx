"use client";
import { useFormStatus } from "react-dom";
/**
 * Submit button that disables and relabels itself while its form is pending.
 * Used by every form in the app so double-submits are impossible without
 * anyone writing loading state by hand.
 */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  className = "btn-primary",
  ...props
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...props}>
      {pending ? pendingLabel : children}
    </button>
  );
}
