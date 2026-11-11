import { useEffect, useRef, useState } from "react";
import { prepareLogo } from "../lib/image";

interface Props {
  /** Currently stored logo (already resolvable by <img>), if any. */
  currentUrl?: string | null;
  /** Called with the processed image, or null when the user clears the selection. */
  onChange: (blob: Blob | null) => void;
  onRemoveCurrent?: () => void;
  disabled?: boolean;
}

/** File picker with a live preview. Resizes/re-encodes in the browser before upload. */
export function LogoPicker({ currentUrl, onChange, onRemoveCurrent, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;
    setBusy(true);
    try {
      const blob = await prepareLogo(file);
      setPreview(URL.createObjectURL(blob));
      onChange(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that image.");
      onChange(null);
      if (input.current) input.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setPreview(null);
    setError(null);
    onChange(null);
    if (input.current) input.current.value = "";
  }

  const shown = preview ?? currentUrl ?? null;

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white">
          {shown ? (
            <img src={shown} alt="Logo preview" className="h-full w-full object-contain p-1.5" />
          ) : (
            <span className="px-1 text-center text-[11px] leading-tight text-slate-500">No logo yet</span>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <label
              className={`cursor-pointer rounded-full border border-indigo-300/40 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/5 ${
                disabled || busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {busy ? "Processing…" : shown ? "Change image" : "Upload image"}
              <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onFile}
                disabled={disabled || busy}
                className="sr-only"
              />
            </label>
            {preview && (
              <button type="button" onClick={clear} className="rounded-full border border-white/15 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
                Undo
              </button>
            )}
            {!preview && currentUrl && onRemoveCurrent && (
              <button type="button" onClick={onRemoveCurrent} disabled={disabled} className="rounded-full border border-white/15 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
                Remove
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">PNG, JPEG or WebP. Square images work best; resized automatically.</p>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
    </div>
  );
}
