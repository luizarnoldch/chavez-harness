import type { ConnectableProvider, ProviderCredentialStatus } from "@chavez-harness/shared";
import { decodePasteBytes, type KeyEvent, type TextareaRenderable } from "@opentui/core";
import { useKeyboard, usePaste } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { matchesShortcut } from "../../../lib/registry/match";
import { getShortcut } from "../../../lib/registry/shortcuts";
import {
  listProviders as defaultListProviders,
  upsertProviderCredential as defaultUpsertProviderCredential,
} from "../api.ts";

const MASK_CHAR = "•";
const VISIBLE_TAIL = 4;

type Step = "list" | "key";

type ProvidersApi = {
  listProviders: typeof defaultListProviders;
  upsertProviderCredential: typeof defaultUpsertProviderCredential;
};

type ConnectDialogProps = {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  /** Override for tests */
  providersApi?: ProvidersApi;
  /** Skip async list fetch (tests). */
  initialProviders?: ProviderCredentialStatus[];
};

function maskApiKey(value: string, reveal: boolean): string {
  if (reveal) return value;
  const chars = Array.from(value);
  if (chars.length <= VISIBLE_TAIL) {
    return MASK_CHAR.repeat(chars.length);
  }
  const hidden = MASK_CHAR.repeat(chars.length - VISIBLE_TAIL);
  return hidden + chars.slice(-VISIBLE_TAIL).join("");
}

/** Strip paste noise so API keys are a single token. */
export function sanitizeApiKeyPaste(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

function isPrintableKey(key: KeyEvent): boolean {
  if (key.eventType === "release") return false;
  if (key.ctrl || key.meta) return false;
  const special = new Set([
    "return",
    "kpenter",
    "tab",
    "escape",
    "backspace",
    "delete",
    "up",
    "down",
    "left",
    "right",
    "home",
    "end",
  ]);
  if (key.name.startsWith("f") && key.name.length <= 3) return false;
  if (special.has(key.name)) return false;
  if (key.sequence.length === 1 && key.sequence >= " ") return true;
  if (key.name.length === 1) return true;
  return false;
}

function providerLabel(p: ProviderCredentialStatus): string {
  const state = !p.supported
    ? "próximamente"
    : p.configured
      ? `configurado · …${p.hint ?? "????"}`
      : "sin key";
  return `${p.provider}  (${state})`;
}

export function ConnectDialog({
  onClose,
  onSuccess,
  onError,
  providersApi,
  initialProviders,
}: ConnectDialogProps) {
  const listProvidersFn = providersApi?.listProviders ?? defaultListProviders;
  const upsertProviderCredential =
    providersApi?.upsertProviderCredential ?? defaultUpsertProviderCredential;
  const listProvidersRef = useRef(listProvidersFn);
  listProvidersRef.current = listProvidersFn;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [step, setStep] = useState<Step>("list");
  const [providers, setProviders] = useState<ProviderCredentialStatus[]>(
    () => initialProviders ?? [],
  );
  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (!initialProviders?.length) return 0;
    const cursorIdx = initialProviders.findIndex((p) => p.provider === "cursor");
    return cursorIdx >= 0 ? cursorIdx : 0;
  });
  const [loading, setLoading] = useState(() => !initialProviders);
  const [busy, setBusy] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ConnectableProvider | null>(
    null,
  );

  const keyRef = useRef<TextareaRenderable>(null);
  const syncingRef = useRef(false);
  const apiKeyRef = useRef("");
  const revealedRef = useRef(false);
  const stepRef = useRef<Step>(step);
  const busyRef = useRef(busy);
  apiKeyRef.current = apiKey;
  revealedRef.current = revealed;
  stepRef.current = step;
  busyRef.current = busy;

  const syncKeyDisplay = useCallback((value: string, reveal: boolean) => {
    const field = keyRef.current;
    if (!field) return;
    const display = maskApiKey(value, reveal);
    if (field.plainText === display) {
      field.cursorOffset = display.length;
      return;
    }
    syncingRef.current = true;
    field.setText(display);
    field.cursorOffset = display.length;
    queueMicrotask(() => {
      syncingRef.current = false;
    });
  }, []);

  const applyApiKey = useCallback(
    (value: string) => {
      apiKeyRef.current = value;
      setApiKey(value);
      syncKeyDisplay(value, revealedRef.current);
    },
    [syncKeyDisplay],
  );

  useEffect(() => {
    if (initialProviders) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await listProvidersRef.current();
        if (cancelled) return;
        setProviders(list);
        const cursorIdx = list.findIndex((p) => p.provider === "cursor");
        setSelectedIndex(cursorIdx >= 0 ? cursorIdx : 0);
      } catch (err) {
        if (!cancelled) {
          onErrorRef.current(
            err instanceof Error ? err.message : "Error al listar providers",
          );
          onCloseRef.current();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialProviders]);

  useEffect(() => {
    if (step !== "key") return;
    syncKeyDisplay(apiKeyRef.current, revealedRef.current);
    keyRef.current?.focus();
  }, [step, syncKeyDisplay]);

  usePaste((event) => {
    if (stepRef.current !== "key" || busyRef.current) return;
    event.preventDefault();
    const next = sanitizeApiKeyPaste(decodePasteBytes(event.bytes));
    if (!next) return;
    applyApiKey(next);
  });

  useKeyboard((key) => {
    if (matchesShortcut(key, getShortcut("focus-prompt")) || key.name === "escape") {
      key.preventDefault();
      if (step === "key") {
        setStep("list");
        setApiKey("");
        setRevealed(false);
        return;
      }
      onClose();
      return;
    }

    if (step === "list") {
      if (loading || providers.length === 0 || busy) return;
      if (key.name === "up") {
        key.preventDefault();
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.name === "down") {
        key.preventDefault();
        setSelectedIndex((i) => Math.min(providers.length - 1, i + 1));
        return;
      }
      if (key.name === "return" || key.name === "kpenter") {
        key.preventDefault();
        const picked = providers[selectedIndex];
        if (!picked) return;
        if (!picked.supported) {
          onError(`${picked.provider} aún no está disponible`);
          return;
        }
        setSelectedProvider(picked.provider);
        setStep("key");
      }
      return;
    }

    // key step
    if (matchesShortcut(key, getShortcut("reveal-password"))) {
      if (key.eventType === "release" || key.repeated) return;
      key.preventDefault();
      const next = !revealedRef.current;
      revealedRef.current = next;
      setRevealed(next);
      syncKeyDisplay(apiKeyRef.current, next);
      return;
    }

    if (key.name === "return" || key.name === "kpenter") {
      key.preventDefault();
      if (busy || !selectedProvider) return;
      const value = apiKeyRef.current.trim();
      if (!value) {
        onError("Pega una API key");
        return;
      }
      setBusy(true);
      void (async () => {
        try {
          const status = await upsertProviderCredential(selectedProvider, value);
          onSuccess(
            `Cursor conectado (…${status.hint ?? "ok"}). Usa provider=cursor en la sesión.`,
          );
          onClose();
        } catch (err) {
          onError(err instanceof Error ? err.message : "No se pudo guardar");
        } finally {
          setBusy(false);
        }
      })();
      return;
    }

    if (key.name === "backspace") {
      key.preventDefault();
      const next = Array.from(apiKeyRef.current).slice(0, -1).join("");
      applyApiKey(next);
      return;
    }

    if (isPrintableKey(key)) {
      key.preventDefault();
      const ch = key.sequence.length === 1 ? key.sequence : key.name;
      applyApiKey(apiKeyRef.current + ch);
    }
  });

  return (
    <box
      border
      borderColor="#414868"
      title="Connect provider"
      paddingLeft={1}
      paddingRight={1}
      flexDirection="column"
      height={step === "list" ? 12 : 8}
    >
      {step === "list" ? (
        <>
          <text fg="#888888">
            {loading ? "Cargando…" : "↑↓ elige · Enter · Esc cierra"}
          </text>
          {!loading
            ? providers.map((p, i) => (
                <text key={p.provider} fg={i === selectedIndex ? "#7aa2f7" : "#c0caf5"}>
                  {i === selectedIndex ? "› " : "  "}
                  {providerLabel(p)}
                </text>
              ))
            : null}
        </>
      ) : (
        <>
          <text fg="#888888">
            API key de {selectedProvider} · F2 revela · Enter guarda · Esc atrás
          </text>
          <textarea
            ref={keyRef}
            focused
            height={1}
            onContentChange={() => {
              if (syncingRef.current) return;
              const field = keyRef.current;
              if (!field) return;
              const expected = maskApiKey(apiKeyRef.current, revealedRef.current);
              if (field.plainText === expected) return;
              // Keep display controlled; ignore native edits (paste via usePaste)
              syncKeyDisplay(apiKeyRef.current, revealedRef.current);
            }}
          />
          <text fg="#565f89">
            {busy ? "Guardando…" : `visible: …${maskApiKey(apiKey, false).slice(-4) || "—"}`}
          </text>
        </>
      )}
    </box>
  );
}
