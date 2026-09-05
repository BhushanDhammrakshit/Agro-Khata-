"use client";

/**
 * Single place where a generated file (PDF / Excel / CSV) is handed to the user.
 *
 * Android's WebView has no download support at all — wry never registers a `DownloadListener`,
 * so `<a download>` on a `blob:` URL is silently dropped, and the Web Share API isn't implemented
 * either. The Tauri mobile shell therefore exposes a `save_file` command that writes the bytes to
 * the device's public Downloads folder (and optionally opens the share sheet); when that bridge is
 * present we use it instead of the browser paths.
 */

type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

export type FileDeliveryStatus = "shared" | "saved" | "downloaded" | "cancelled";
export type FileDelivery = { status: FileDeliveryStatus; location?: string };

const DEFAULT_MIME = "application/octet-stream";

function nativeInvoke(): TauriInvoke | null {
  if (typeof window === "undefined") return null;
  const internals = (window as unknown as { __TAURI_INTERNALS__?: { invoke?: TauriInvoke } }).__TAURI_INTERNALS__;
  return typeof internals?.invoke === "function" ? internals.invoke.bind(internals) : null;
}

/** True when running inside the Tauri desktop/mobile shell rather than a plain browser tab. */
export function isNativeShell(): boolean {
  return nativeInvoke() !== null;
}

export function isShareAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Self-contained toast — the native shells show no download UI of their own, so every delivery
 *  has to say where the file ended up (or why it failed). */
function notify(message: string, tone: "info" | "error") {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = message;
  el.setAttribute("role", "status");
  el.style.cssText = [
    "position:fixed",
    "left:50%",
    "transform:translateX(-50%)",
    "bottom:calc(1.25rem + env(safe-area-inset-bottom))",
    "z-index:2147483647",
    "max-width:min(90vw,28rem)",
    "padding:0.65rem 1rem",
    "border-radius:0.75rem",
    "text-align:center",
    "color:#ffffff",
    "font:500 0.875rem/1.35 system-ui,-apple-system,sans-serif",
    "box-shadow:0 10px 25px rgba(15,23,42,0.25)",
    `background:${tone === "error" ? "#b91c1c" : "#0f3d5c"}`,
  ].join(";");
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 4500);
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  // btoa() needs a binary string, and spreading the whole array overflows the argument limit.
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function downloadViaAnchor(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel a download that hasn't started reading the blob yet.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Delivers `blob` to the user. Pass `share` to prefer a share sheet over a plain save.
 * Throws only when the native bridge itself fails; browser paths always fall back to a download.
 */
export async function deliverFile(
  blob: Blob,
  fileName: string,
  share?: { title: string; text: string },
): Promise<FileDelivery> {
  const invoke = nativeInvoke();
  if (invoke) {
    let location: string;
    try {
      location = await invoke<string>("save_file", {
        fileName,
        mimeType: blob.type || DEFAULT_MIME,
        dataBase64: await toBase64(blob),
        share: Boolean(share),
      });
    } catch (error) {
      notify(typeof error === "string" ? error : "Could not save the file to this device.", "error");
      throw error instanceof Error ? error : new Error(String(error));
    }
    if (share) return { status: "shared", location };
    notify(`Saved to ${location}`, "info");
    return { status: "saved", location };
  }

  if (share && typeof navigator !== "undefined" && typeof File !== "undefined") {
    const file = new File([blob], fileName, { type: blob.type || DEFAULT_MIME });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ ...share, files: [file] });
        return { status: "shared" };
      } catch (error) {
        if (isShareAbort(error)) return { status: "cancelled" };
        // Share sheets fail intermittently (e.g. user activation expired while the PDF rendered) —
        // fall through so the user still gets the file.
      }
    }
  }

  downloadViaAnchor(blob, fileName);
  return { status: "downloaded" };
}
