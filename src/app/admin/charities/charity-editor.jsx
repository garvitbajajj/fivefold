"use client";

import { useActionState, useState } from "react";
import { saveCharity, retireCharity, restoreCharity } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { money } from "@/lib/format";

/** Derive a URL slug from the name so it rarely has to be typed. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CharityForm({ charity, onDone }) {
  const [state, action] = useActionState(async (prev, fd) => {
    const result = await saveCharity(prev, fd);
    if (result?.ok && onDone) onDone();
    return result;
  }, null);

  const [slug, setSlug] = useState(charity?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(charity));

  return (
    <form action={action} className="space-y-4">
      {charity && <input type="hidden" name="id" value={charity.id} />}
      {/* Keeps an edited charity active unless it was already retired. */}
      {(!charity || charity.is_active) && (
        <input type="hidden" name="is_active" value="on" />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`name-${charity?.id ?? "new"}`}>
            Name
          </label>
          <input
            id={`name-${charity?.id ?? "new"}`}
            name="name"
            required
            defaultValue={charity?.name}
            className="input"
            onChange={(e) => {
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </div>

        <div>
          <label className="label" htmlFor={`slug-${charity?.id ?? "new"}`}>
            URL slug
          </label>
          <input
            id={`slug-${charity?.id ?? "new"}`}
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="input font-mono text-sm"
            placeholder="mind-the-gap"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`cat-${charity?.id ?? "new"}`}>
            Category
          </label>
          <input
            id={`cat-${charity?.id ?? "new"}`}
            name="category"
            required
            defaultValue={charity?.category}
            className="input"
            placeholder="Mental health"
          />
        </div>

        <div>
          <label className="label" htmlFor={`img-${charity?.id ?? "new"}`}>
            Image URL <span className="text-ink-600">optional</span>
          </label>
          <input
            id={`img-${charity?.id ?? "new"}`}
            name="image_url"
            type="url"
            defaultValue={charity?.image_url ?? ""}
            className="input"
            placeholder="https://…"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor={`tag-${charity?.id ?? "new"}`}>
          Tagline
        </label>
        <input
          id={`tag-${charity?.id ?? "new"}`}
          name="tagline"
          required
          defaultValue={charity?.tagline}
          className="input"
          placeholder="One line on what they do"
        />
      </div>

      <div>
        <label className="label" htmlFor={`desc-${charity?.id ?? "new"}`}>
          Description
        </label>
        <textarea
          id={`desc-${charity?.id ?? "new"}`}
          name="description"
          required
          rows={4}
          defaultValue={charity?.description}
          className="input resize-y"
          placeholder="What the money does, in plain terms."
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="is_featured"
          defaultChecked={charity?.is_featured}
          className="h-4 w-4 accent-gold-400"
        />
        Feature on the homepage
        <span className="text-xs text-ink-500">(replaces the current spotlight)</span>
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-clay-600/15 px-3 py-2.5 text-sm text-clay-400"
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-moss-500/15 px-3 py-2.5 text-sm text-moss-300">
          {state.ok}
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton className="btn-primary !py-2.5 text-sm" pendingLabel="Saving…">
          {charity ? "Save changes" : "Add charity"}
        </SubmitButton>
        {onDone && (
          <button type="button" onClick={onDone} className="btn-ghost !py-2.5 text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function CharityEditor({ charities, totals }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Directory</p>
            <h2 className="mt-2 font-display text-2xl">
              {charities.filter((c) => c.is_active).length} active causes
            </h2>
          </div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="btn-primary !py-2.5 text-sm"
            >
              Add charity
            </button>
          )}
        </div>

        {adding && (
          <div className="mt-6 border-t border-ink-700 pt-6">
            <CharityForm onDone={() => setAdding(false)} />
          </div>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {charities.map((charity) => {
          const raised = totals[charity.id]?.raised ?? 0;
          const supporters = totals[charity.id]?.supporters ?? 0;
          const isEditing = editing === charity.id;

          return (
            <article
              key={charity.id}
              className={`card ${charity.is_active ? "" : "opacity-60"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl">{charity.name}</h3>
                    <span className="pill !text-[0.625rem] text-moss-400">
                      {charity.category}
                    </span>
                    {charity.is_featured && (
                      <span className="pill !text-[0.625rem] text-gold-400">
                        spotlight
                      </span>
                    )}
                    {!charity.is_active && (
                      <span className="pill !text-[0.625rem] text-ink-500">retired</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-ink-500">{charity.tagline}</p>
                  <p className="mt-2 font-mono text-xs text-ink-600">/{charity.slug}</p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="font-display text-xl tnum text-moss-300">
                      {money(raised)}
                    </p>
                    <p className="text-xs text-ink-500">
                      {supporters} backer{supporters === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(isEditing ? null : charity.id)}
                      className="rounded-lg px-3 py-1.5 text-xs text-paper-300 hover:bg-ink-800"
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>

                    <form action={charity.is_active ? retireCharity : restoreCharity}>
                      <input type="hidden" name="id" value={charity.id} />
                      <SubmitButton
                        className={`rounded-lg px-3 py-1.5 text-xs hover:bg-ink-800 disabled:opacity-50 ${
                          charity.is_active ? "text-clay-400" : "text-moss-300"
                        }`}
                        pendingLabel="…"
                      >
                        {charity.is_active ? "Retire" : "Restore"}
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="border-t border-ink-700 bg-ink-900 p-5">
                  <CharityForm charity={charity} onDone={() => setEditing(null)} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
