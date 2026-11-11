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
2. Fork the repo and create a branch (`feat/...` or `fix/...`).
3. Keep changes focused; one logical change per pull request.
4. Make sure it builds and type-checks:
   ```bash
   pnpm typecheck
   pnpm build
   ```
5. Open a pull request describing the change and how you tested it.

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
