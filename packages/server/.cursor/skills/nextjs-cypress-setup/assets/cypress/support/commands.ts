/// <reference types="cypress" />
/// <reference path="./index.d.ts" />

import type { AuthCredentials } from "./index.d";
import { sel } from "./selectors";

const AUTH_ORIGIN =
  (Cypress.config("baseUrl") as string | null) ?? "http://localhost:3000";

function applyAuthCookies(setCookie: string | string[] | undefined) {
  if (!setCookie) {
    throw new Error("Auth response missing Set-Cookie header");
  }

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const raw of cookies) {
    const [pair, ...attrs] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const httpOnly = attrs.some((a) => a.trim().toLowerCase() === "httponly");
    cy.setCookie(name, value, {
      path: "/",
      httpOnly,
      sameSite: "lax",
    });
  }
}

function hasReactFiber(el: HTMLElement) {
  return Object.keys(el).some(
    (key) =>
      key.startsWith("__reactFiber") ||
      key.startsWith("__reactInternalInstance"),
  );
}

Cypress.Commands.add("waitForReact", (selector: string) => {
  cy.get(selector).should(($el) => {
    expect(
      hasReactFiber($el[0] as HTMLElement),
      `expected ${selector} to be React-hydrated`,
    ).to.eq(true);
  });
});

Cypress.Commands.add(
  "signUpUi",
  (user: Required<Pick<AuthCredentials, "name" | "email" | "password">>) => {
    cy.visit("/sign-up");
    cy.waitForReact(sel.auth.signUpForm);
    cy.get(sel.auth.signUpForm).within(() => {
      cy.get('input[name="name"]').clear().type(user.name);
      cy.get('input[name="email"]').clear().type(user.email);
      cy.get('input[name="password"]').clear().type(user.password);
      cy.root().submit();
    });
    // better-auth autoSignIn may leave a session; proxy then sends /sign-in → /dashboard
    cy.location("pathname").should("be.oneOf", ["/sign-in", "/dashboard"]);
  },
);

Cypress.Commands.add(
  "signInUi",
  (user: Pick<AuthCredentials, "email" | "password">) => {
    cy.visit("/sign-in");
    cy.waitForReact(sel.auth.signInForm);
    cy.get(sel.auth.signInForm).within(() => {
      cy.get('input[name="email"]').clear().type(user.email);
      cy.get('input[name="password"]').clear().type(user.password);
      cy.root().submit();
    });
    cy.location("pathname").should("eq", "/dashboard");
  },
);

Cypress.Commands.add(
  "signUpApi",
  (user: Required<Pick<AuthCredentials, "name" | "email" | "password">>) => {
    cy.request({
      method: "POST",
      url: "/api/auth/sign-up/email",
      headers: {
        Origin: AUTH_ORIGIN,
      },
      body: {
        name: user.name,
        email: user.email,
        password: user.password,
        rememberMe: false,
      },
      failOnStatusCode: true,
    }).then((response) => {
      applyAuthCookies(response.headers["set-cookie"]);
    });
  },
);

Cypress.Commands.add(
  "signInApi",
  (user: Pick<AuthCredentials, "email" | "password">) => {
    cy.request({
      method: "POST",
      url: "/api/auth/sign-in/email",
      headers: {
        Origin: AUTH_ORIGIN,
      },
      body: {
        email: user.email,
        password: user.password,
        rememberMe: false,
      },
      failOnStatusCode: true,
    }).then((response) => {
      applyAuthCookies(response.headers["set-cookie"]);
    });
  },
);
