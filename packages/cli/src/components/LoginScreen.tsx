import type { KeyEvent, TextareaRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { signIn as defaultSignIn, signUp as defaultSignUp } from "../auth/api.ts";
import { defaultApiUrl } from "../auth/credentials.ts";
import { useToast } from "../providers/Toast";
import { matchesShortcut } from "../registry/match";
import { getShortcut } from "../registry/shortcuts";
import { Toast } from "./Toast";

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
const NORMAL_BORDER = "#414868";
const EXIT_BORDER = "#e0af68";

export function LoginScreen({ onSuccess, onExit, authApi }: LoginScreenProps) {
  const { show } = useToast();
  const signIn = authApi?.signIn ?? defaultSignIn;
  const signUp = authApi?.signUp ?? defaultSignUp;
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<FocusField>("email");
  const [busy, setBusy] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const nameRef = useRef<TextareaRenderable>(null);
  const emailRef = useRef<TextareaRenderable>(null);
  const passwordRef = useRef<TextareaRenderable>(null);

  useEffect(() => {
    setFocused(mode === "register" ? "name" : "email");
  }, [mode]);

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

  const handleKeyDown = useCallback(
    (key: KeyEvent) => {
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
    [confirmExit, onExit, cycleFocus],
  );

  useKeyboard((key) => {
    const active =
      focused === "name"
        ? nameRef.current
        : focused === "email"
          ? emailRef.current
          : passwordRef.current;
    if (active?.focused) return;
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
            width={48}
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
          width={48}
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
          width={48}
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
              setPassword(passwordRef.current?.plainText ?? "");
            }}
            onSubmit={() => void handleSubmit()}
          />
        </box>

        {confirmExit ? (
          <text fg={EXIT_BORDER}>{EXIT_HINT}</text>
        ) : busy ? (
          <text fg="#e0af68">Conectando…</text>
        ) : (
          <text fg="#565f89">
            Tab campos · Enter {submitLabel} · {modeHint} · Ctrl+C dos veces sale
          </text>
        )}
      </box>
    </box>
  );
}
