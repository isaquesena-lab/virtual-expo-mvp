import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  ready(callback: () => void): void;
  render(container: HTMLElement, options: {
    sitekey: string;
    theme: "dark";
    callback(token: string): void;
    "expired-callback"(): void;
    "error-callback"(): void;
    "timeout-callback"(): void;
  }): string;
  remove(widgetId: string): void;
};

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("Could not load anti-bot verification."));
    };
    const timer = window.setTimeout(fail, 15_000);
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.addEventListener("error", fail, { once: true });
    script.addEventListener("load", () => {
      const api = (window as Window & { turnstile?: TurnstileApi }).turnstile;
      if (!api) {
        fail();
        return;
      }
      api.ready(() => {
        window.clearTimeout(timer);
        resolve(api);
      });
    }, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    scriptPromise = undefined;
    throw error;
  });
  return scriptPromise;
}

export function Turnstile({ siteKey, onToken }: {
  siteKey: string;
  onToken(token: string | null): void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("Loading anti-bot verification…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let widgetId: string | undefined;
    let api: TurnstileApi | undefined;
    onToken(null);
    setFailed(false);
    setStatus("Loading anti-bot verification…");

    const invalidate = (message: string) => {
      if (!active) return;
      onToken(null);
      setStatus(message);
      setFailed(true);
    };

    loadTurnstile().then((loadedApi) => {
      if (!active || !container.current) return;
      api = loadedApi;
      setStatus("Complete the anti-bot verification before submitting.");
      widgetId = api.render(container.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token) => {
          if (!active) return;
          onToken(token);
          setStatus("Anti-bot verification complete.");
          setFailed(false);
        },
        "expired-callback": () => invalidate("Verification expired. Please verify again."),
        "error-callback": () => invalidate("Anti-bot verification failed. Please retry."),
        "timeout-callback": () => invalidate("Verification timed out. Please retry."),
      });
    }).catch(() => invalidate("Could not load anti-bot verification. Check your connection and retry."));

    return () => {
      active = false;
      if (api && widgetId !== undefined) api.remove(widgetId);
    };
  }, [siteKey, onToken, attempt]);

  return (
    <div className="space-y-2">
      <div ref={container} />
      <p role={failed ? "alert" : "status"} className="text-sm text-slate-400">{status}</p>
      {failed && (
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="text-sm text-indigo-300 underline"
        >
          Retry verification
        </button>
      )}
    </div>
  );
}
