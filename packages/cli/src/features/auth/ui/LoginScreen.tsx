import type { KeyEvent, TextareaRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../../../lib/providers/Toast";
import { Toast } from "../../../lib/providers/ToastView";
import { matchesShortcut } from "../../../lib/registry/match";
import { getShortcut } from "../../../lib/registry/shortcuts";
import { signIn as defaultSignIn, signUp as defaultSignUp } from "../api/api.ts";
import { defaultApiUrl } from "../api/credentials.ts";

export type AuthMode = "login" | "register";

type FocusField = "name" | "email" | "password";

type AuthApi = {
  signIn: typeof defaultSignIn;
  signUp: typeof defaultSignUp;
};

type LoginScreenProps = {
  onSuccess: () => void;
  onExit: () => void;
  /** Override for tests */
  authApi?: AuthApi;
};

const AUTH_SUBMIT_BINDINGS = [
  { name: "return", action: "submit" as const },
  { name: "kpenter", action: "submit" as const },
];

export const EXIT_HINT = "Pulsa Ctrl+C otra vez para salir";
export const REVEAL_PASSWORD_HINT = "F2 muestra/oculta la contraseña";
const NORMAL_BORDER = "#414868";
const EXIT_BORDER = "#e0af68";
const MASK_CHAR = "•";
const HELP_WIDTH = 48;

function maskPassword(value: string): string {
  return MASK_CHAR.repeat(Array.from(value).length);
}

function isPrintablePasswordKey(key: KeyEvent): boolean {
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
    "f1",
    "f2",
    "f3",
    "f4",
    "f5",
    "f6",
    "f7",
    "f8",
    "f9",
    "f10",
    "f11",
    "f12",
  ]);
  if (special.has(key.name)) return false;
  if (key.sequence.length === 1 && key.sequence >= " ") return true;
  if (key.name.length === 1) return true;
  return false;
}

function isRevealTogglePress(key: KeyEvent): boolean {
  if (key.eventType === "release" || key.repeated) return false;
  return matchesShortcut(key, getShortcut("reveal-password"));
}

export function LoginScreen({ onSuccess, onExit, authApi }: LoginScreenProps) {
  const { show } = useToast();
  const signIn = authApi?.signIn ?? defaultSignIn;
  const signUp = authApi?.signUp ?? defaultSignUp;
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focused, setFocused] = useState<FocusField>("email");
  const [busy, setBusy] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const nameRef = useRef<TextareaRenderable>(null);
  const emailRef = useRef<TextareaRenderable>(null);
  const passwordRef = useRef<TextareaRenderable>(null);
  const syncingDisplayRef = useRef(false);
  const passwordVisibleRef = useRef(false);
  const passwordValueRef = useRef("");

  passwordValueRef.current = password;

  const syncPasswordDisplay = useCallback((value: string, visible: boolean) => {
    const field = passwordRef.current;
    if (!field) return;
    const display = visible ? value : maskPassword(value);
    syncingDisplayRef.current = true;
    field.setText(display);
    field.cursorOffset = display.length;
    syncingDisplayRef.current = false;
  }, []);

  const hidePassword = useCallback(() => {
    if (!passwordVisibleRef.current) return;
    passwordVisibleRef.current = false;
    setPasswordVisible(false);
    syncPasswordDisplay(passwordValueRef.current, false);
  }, [syncPasswordDisplay]);

  const togglePasswordVisibility = useCallback(() => {
    const next = !passwordVisibleRef.current;
    passwordVisibleRef.current = next;
    setPasswordVisible(next);
    syncPasswordDisplay(passwordValueRef.current, next);
  }, [syncPasswordDisplay]);

  useEffect(() => {
    setFocused(mode === "register" ? "name" : "email");
  }, [mode]);

  useEffect(() => {
    if (focused !== "password") {
      hidePassword();
    }
  }, [focused, hidePassword]);

  const fieldsForMode = useCallback((): FocusField[] => {
    return mode === "register" ? ["name", "email", "password"] : ["email", "password"];
  }, [mode]);

  const cycleFocus = useCallback(() => {
    const fields = fieldsForMode();
    setFocused((prev) => {
      const current = fields.includes(prev) ? prev : fields[0]!;
      const idx = fields.indexOf(current);
      return fields[(idx + 1) % fields.length]!;
    });
  }, [fieldsForMode]);

  const handleSubmit = useCallback(async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      show("Introduce email y contraseña", "error");
      return;
    }
    if (mode === "register" && !name.trim()) {
      show("Introduce tu nombre", "error");
      return;
    }

    setBusy(true);
    setConfirmExit(false);
    try {
      if (mode === "register") {
        await signUp(
          { name: name.trim(), email: email.trim(), password },
          defaultApiUrl(),
        );
        show("Cuenta creada", "success");
      } else {
        await signIn(email.trim(), password, defaultApiUrl());
        show("Sesión iniciada", "success");
      }
      onSuccess();
    } catch (err) {
      show(err instanceof Error ? err.message : "Error de autenticación", "error");
    } finally {
      setBusy(false);
    }
  }, [busy, email, password, name, mode, onSuccess, show, signIn, signUp]);

  const handlePasswordKeyDown = useCallback(
    (key: KeyEvent) => {
      // F2 is handled only in useKeyboard to avoid double-toggle.
      if (matchesShortcut(key, getShortcut("reveal-password"))) {
        key.preventDefault();
        key.stopPropagation();
        return true;
      }

      if (!passwordRef.current?.focused) {
        return false;
      }

      if (passwordVisibleRef.current) {
        return false;
      }

      if (key.name === "backspace") {
        key.preventDefault();
        key.stopPropagation();
        const next = Array.from(passwordValueRef.current).slice(0, -1).join("");
        passwordValueRef.current = next;
        setPassword(next);
        syncPasswordDisplay(next, false);
        return true;
      }

      if (isPrintablePasswordKey(key)) {
        key.preventDefault();
        key.stopPropagation();
        const ch = key.sequence.length >= 1 ? key.sequence : key.name;
        const next = passwordValueRef.current + ch;
        passwordValueRef.current = next;
        setPassword(next);
        syncPasswordDisplay(next, false);
        return true;
      }

      return false;
    },
    [syncPasswordDisplay],
  );

  const handleKeyDown = useCallback(
    (key: KeyEvent) => {
      if (handlePasswordKeyDown(key)) {
        return;
      }

      const isExitChord = matchesShortcut(key, getShortcut("clear-or-exit"));

      if (confirmExit && !isExitChord) {
        setConfirmExit(false);
      }

      if (isExitChord) {
        key.preventDefault();
        key.stopPropagation();
        if (confirmExit) {
          onExit();
          return;
        }
        setConfirmExit(true);
        return;
      }

      if (matchesShortcut(key, getShortcut("toggle-auth-mode"))) {
        key.preventDefault();
        key.stopPropagation();
        setConfirmExit(false);
        setMode((prev) => (prev === "login" ? "register" : "login"));
        return;
      }

      if (key.name === "tab") {
        key.preventDefault();
        setConfirmExit(false);
        cycleFocus();
      }
    },
    [confirmExit, onExit, cycleFocus, handlePasswordKeyDown],
  );

  useKeyboard((key) => {
    if (matchesShortcut(key, getShortcut("reveal-password"))) {
      if (!isRevealTogglePress(key)) {
        key.preventDefault();
        key.stopPropagation();
        return;
      }
      key.preventDefault();
      key.stopPropagation();
      togglePasswordVisibility();
      return;
    }

    const anyFieldFocused =
      Boolean(nameRef.current?.focused) ||
      Boolean(emailRef.current?.focused) ||
      Boolean(passwordRef.current?.focused);
    if (anyFieldFocused) return;
    handleKeyDown(key);
  });

  const borderColor = confirmExit ? EXIT_BORDER : NORMAL_BORDER;
  const title =
    mode === "login" ? "Inicia sesión para continuar" : "Crea una cuenta para continuar";
  const submitLabel = mode === "login" ? "Iniciar sesión" : "Registrarse";
  const modeHint =
    mode === "login"
      ? "Ctrl+R para registrarte"
      : "Ctrl+R para iniciar sesión";

  return (
    <box flexGrow={1} flexDirection="column">
      <Toast />
      <box
        flexGrow={1}
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        gap={1}
      >
        <text fg="#7aa2f7">Chavez Harness</text>
        <text fg="#888888">{title}</text>

        {mode === "register" ? (
          <box
            title="Nombre"
            border
            borderColor={borderColor}
            width={HELP_WIDTH}
            height={3}
            paddingLeft={1}
          >
            <textarea
              ref={nameRef}
              placeholder="Tu nombre"
              initialValue=""
              keyBindings={AUTH_SUBMIT_BINDINGS}
              focused={focused === "name" && !busy}
              onKeyDown={handleKeyDown}
              onContentChange={() => {
                setName(nameRef.current?.plainText ?? "");
              }}
              onSubmit={() => setFocused("email")}
            />
          </box>
        ) : null}

        <box
          title="Email"
          border
          borderColor={borderColor}
          width={HELP_WIDTH}
          height={3}
          paddingLeft={1}
        >
          <textarea
            ref={emailRef}
            placeholder="tu@email.com"
            initialValue=""
            keyBindings={AUTH_SUBMIT_BINDINGS}
            focused={focused === "email" && !busy}
            onKeyDown={handleKeyDown}
            onContentChange={() => {
              setEmail(emailRef.current?.plainText ?? "");
            }}
            onSubmit={() => setFocused("password")}
          />
        </box>

        <box
          title="Contraseña"
          border
          borderColor={borderColor}
          width={HELP_WIDTH}
          height={3}
          paddingLeft={1}
        >
          <textarea
            ref={passwordRef}
            placeholder="••••••••"
            initialValue=""
            keyBindings={AUTH_SUBMIT_BINDINGS}
            focused={focused === "password" && !busy}
            onKeyDown={handleKeyDown}
            onContentChange={() => {
              if (syncingDisplayRef.current) return;
              if (!passwordVisibleRef.current) return;
              const plain = passwordRef.current?.plainText ?? "";
              const masked = maskPassword(passwordValueRef.current);
              if (plain === masked) return;
              passwordValueRef.current = plain;
              setPassword(plain);
            }}
            onSubmit={() => void handleSubmit()}
          />
        </box>

        {confirmExit ? (
          <text fg={EXIT_BORDER}>{EXIT_HINT}</text>
        ) : busy ? (
          <text fg="#e0af68">Conectando…</text>
        ) : (
          <box width={HELP_WIDTH} flexDirection="column" alignItems="center">
            <text fg="#565f89">Tab campos · Enter {submitLabel}</text>
            <text fg="#565f89">{modeHint}</text>
            <text fg="#565f89">{REVEAL_PASSWORD_HINT}</text>
            <text fg="#565f89">Ctrl+C dos veces sale</text>
          </box>
        )}
      </box>
    </box>
  );
}
