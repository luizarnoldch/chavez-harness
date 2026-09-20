import { sel } from "../support/selectors";

describe("[Entity]s CRUD", () => {
  beforeEach(() => {
    cy.fixture("user").then((user) => {
      cy.signUpApi({
        name: user.name,
        email: user.email,
        password: user.password,
      });
      cy.signInApi({
        email: user.email,
        password: user.password,
      });
    });
  });

  it("creates, updates, and deletes a [entity]", () => {
    cy.visit("/[entity]s");
    cy.waitForReact(sel.[entity]s.list);
    cy.contains("h1", "[Entity]s").should("be.visible");
    cy.contains("No [entity]s found.").should("be.visible");

    // 1) Open create form
    cy.get(sel.[entity]s.openCreateBtn).click();
    cy.get(sel.[entity]s.createForm).should("be.visible");

    // 2) Fill title → Create
    cy.get(sel.[entity]s.createTitleInput).clear().type("Buy milk");
    cy.get(sel.[entity]s.createSubmitBtn).click();

    // 3) Assert row → Edit
    cy.get(sel.[entity]s.row)
      .should("have.length", 1)
      .within(() => {
        cy.get(sel.[entity]s.title).should("contain", "Buy milk");
        cy.get(sel.[entity]s.editBtn).click();
      });

    // 4) Update title → Save
    cy.get(sel.[entity]s.updateForm).should("be.visible");
    cy.get(sel.[entity]s.updateTitleInput).clear().type("Buy oat milk");
    cy.get(sel.[entity]s.updateSubmitBtn).click();

    // 5) Assert row → Delete
    cy.get(sel.[entity]s.row)
      .should("have.length", 1)
      .within(() => {
        cy.get(sel.[entity]s.title).should("contain", "Buy oat milk");
        cy.get(sel.[entity]s.deleteBtn).click();
      });

    cy.get(sel.[entity]s.row).should("not.exist");
    cy.contains("No [entity]s found.").should("be.visible");
  });
});
