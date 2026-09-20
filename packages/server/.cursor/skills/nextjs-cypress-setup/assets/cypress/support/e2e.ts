/// <reference types="cypress" />
/// <reference path="./index.d.ts" />

import "./commands";

beforeEach(() => {
  cy.task("db:reset");
  cy.task("db:seed");
});
