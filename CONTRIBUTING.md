# Contributing

Thanks for your interest in improving Virtual Expo! This is an independent,
open-source project. Contributions of all sizes are welcome.

## Getting started

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:setup        # local D1 tables + example booths
pnpm dev             # http://localhost:5173
```

See the [README](README.md) for the full architecture overview and the
[`docs/`](docs/) folder for product scope, data model and decisions.

## How to contribute

1. Open an issue first for anything non-trivial, so we can agree on the approach.
2. Use the canonical repository: [prohound/virtual-expo-mvp](https://github.com/prohound/virtual-expo-mvp).
   Contributors with write access can create a branch there; otherwise, fork it first.
   If your clone predates the ownership transfer, update its origin:
   ```bash
   git remote set-url origin https://github.com/prohound/virtual-expo-mvp.git
   ```
   Keep `origin` pointing to your fork if using one, and configure the Prohound repo
   as `upstream` instead. Start a `feat/...` or `fix/...` branch from the latest `main`.
3. Keep changes focused; one logical change per pull request.
4. Run the same checks as CI:
   ```bash
   pnpm test
   pnpm typecheck
   pnpm build
   ```
5. Push your branch and open a pull request against `prohound/virtual-expo-mvp:main`,
   describing the change and how you tested it. Use a draft PR while work is in progress:
   ```bash
   git push -u origin HEAD
   gh pr create --repo prohound/virtual-expo-mvp --base main --draft
   ```
   The GitHub CLI command requires authentication; opening the PR in the web interface
   works too. For a fork, select your fork's branch as the PR head.
6. Wait for CI and maintainer review before merging. CI runs tests, TypeScript checks,
   and the production build; it does not deploy to Cloudflare. WAF rules and production
   secrets are configured separately, not through a PR.

### Recommended repository settings

Maintainers should protect `main` with a branch rule/ruleset requiring pull requests,
review approval, and the CI build check before merging. Configure this in the repository
settings; editing the workflow alone does not enable branch protection. Keep deployment
credentials out of pull-request workflows, especially for contributions from forks.

## Code style

- TypeScript, React function components, and Tailwind for styling.
- Validate all input on the Worker with zod; use parameterized D1 statements.
- Render user-supplied text as plain text — never `dangerouslySetInnerHTML`.
- Keep user-facing copy in English.

## Ground rules (please read)

This project is deliberately **independent** and must not imply affiliation with,
or impersonate, any real event or organizer:

- Do not add any third party's logos, trademarks, official maps, or visual identity.
- Do not copy another event's branding or name, or a close imitation of it.
- Do not add real companies', organizers', or attendees' data without permission.
- Keep listings moderated: nothing is published without review.

## Security

Never commit secrets. `.dev.vars`, `.env*` and `.wrangler/` are git-ignored —
keep it that way. If you find a security issue, please report it privately to the
maintainer rather than opening a public issue.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
