/**
 * Single source of truth for Cypress `data-cy-*` selectors.
 * Always select with [attr="value"] — attribute names can be shared across elements.
 * Entity blocks (e.g. tasks) are added by nextjs-cypress-e2e.
 */
export const sel = {
  auth: {
    signUpForm: '[data-cy-submit-sign-up-form="sign-up-form"]',
    signInForm: '[data-cy-submit-sign-in-form="sign-in-form"]',
  },
} as const;
