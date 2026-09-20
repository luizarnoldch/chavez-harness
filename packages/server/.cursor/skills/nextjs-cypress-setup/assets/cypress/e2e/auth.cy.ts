import { sel } from "../support/selectors";

describe("Auth (UI)", () => {
  it("signs up and then signs in through the forms", () => {
    cy.fixture("user").then((user) => {
      cy.signUpUi({
        name: user.name,
        email: user.email,
        password: user.password,
      });

      cy.clearAllCookies();

      cy.signInUi({
        email: user.email,
        password: user.password,
      });

      cy.contains(/dashboard/i).should("exist");
      cy.get(sel.auth.signInForm).should("not.exist");
    });
  });
});
