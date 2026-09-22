"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { attachProof } from "./actions";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

/**
 * Uploads a screenshot of the winner's scores, then records its path.
 *
 * The file goes browser-to-storage directly rather than through a Server
 * Action, because Server Actions serialise their payload and a 5MB screenshot
 * would be encoded into the request body. Storage takes the binary as-is.
 *
 * The bucket is private: nobody can read the file back except its owner and an
 * admin, both via short-lived signed URLs.
 */
export function ProofUpload({ winnerId, rejected }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      setStatus({ error: "Upload a PNG, JPEG or WebP image." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus({ error: "That image is over 5MB. Try a smaller screenshot." });
      return;
    }

    setBusy(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus({ error: "Your session expired. Sign in again." });
        return;
      }

      // Folder must be the user's own id — the storage policy checks it.
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${user.id}/${winnerId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("winner-proof")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setStatus({ error: uploadError.message });
        return;
      }

      const form = new FormData();
      form.set("winner_id", winnerId);
      form.set("path", path);
      setStatus(await attachProof(null, form));
    } catch {
      setStatus({ error: "Upload failed. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label
        className={`btn-primary !py-2 text-sm ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
      >
        {busy ? "Uploading…" : rejected ? "Upload a new screenshot" : "Upload proof"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFile}
          disabled={busy}
          className="sr-only"
        />
      </label>

      {status?.error && (
        <p role="alert" className="mt-2 text-sm text-clay-400">
          {status.error}
        </p>
      )}
      {status?.ok && <p className="mt-2 text-sm text-moss-300">{status.ok}</p>}
    </div>
  );
}
