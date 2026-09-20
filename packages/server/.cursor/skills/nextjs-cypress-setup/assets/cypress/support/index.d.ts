export type AuthCredentials = {
  name?: string;
  email: string;
  password: string;
};

declare global {
  namespace Cypress {
    interface Chainable {
      waitForReact(selector: string): Chainable<JQuery<HTMLElement>>;
      signUpUi(
        user: Required<Pick<AuthCredentials, "name" | "email" | "password">>,
      ): Chainable<void>;
      signInUi(
        user: Pick<AuthCredentials, "email" | "password">,
      ): Chainable<void>;
      signUpApi(
        user: Required<Pick<AuthCredentials, "name" | "email" | "password">>,
      ): Chainable<void>;
      signInApi(
        user: Pick<AuthCredentials, "email" | "password">,
      ): Chainable<void>;
    }
  }
}

export {};
