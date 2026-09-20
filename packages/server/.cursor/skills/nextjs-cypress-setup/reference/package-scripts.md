# Package scripts

| Script | Command |
|--------|---------|
| `cy:open` | `cypress open` |
| `cy:run` | `cypress run --browser chrome` |
| `cy:headless` | `cypress run --e2e --browser chrome --headless` |
| `test:e2e` | `cypress run --browser chrome` |

Do **not** add `cy:headless:verbose` pointing at unrelated specs.

Applied by `scripts/patch-package-scripts.sh`.
