"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { storeSessionToken } from "@/lib/session-token";

type SignUpFormProps = {
  redirectTo?: string;
};

export function SignUpForm({ redirectTo = "/workspaces" }: SignUpFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (result.error) {
        toast.error(result.error.message ?? "No se pudo crear la cuenta");
        return;
      }
      const token = (result.data as { token?: string } | null)?.token ?? null;
      storeSessionToken(token);
      window.location.assign(redirectTo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de red");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full border-border/80 bg-card/90 shadow-none">
      <CardHeader className="gap-1 px-5 pt-6 pb-2 sm:px-6">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Crear cuenta
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm leading-relaxed">
          Misma identidad para la web y el TUI.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4 px-5 sm:px-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 text-base"
            />
            <p className="text-muted-foreground text-xs">Mínimo 8 caracteres.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-5 pt-2 pb-6 sm:px-6">
          <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
            {pending ? "Creando…" : "Registrarme"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            ¿Ya tienes cuenta?{" "}
            <a href="/login" className="text-primary underline-offset-4 hover:underline">
              Inicia sesión
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
