# Lote 1 — Next.js + Postgres com proteção de credenciais

## Problem Statement

O produto atual depende de React/Vite, acesso direto do navegador aos serviços do projeto Supabase original e ferramentas/metadados da Lovable. O usuário quer conduzir a evolução em um novo repositório, com um lote por branch criada da main, preservando a interface e eliminando o risco de repetir o versionamento de configurações sensíveis. O novo repositório é público e vazio; copiar o histórico antigo levaria consigo arquivos de ambiente e chaves públicas já registradas.

## Solution

Entregar o conjunto de funcionalidades implementadas em uma aplicação Next.js que usa Postgres pelo servidor, com login, sessões, QR Codes por usuário, rastreamento e analytics básicos. Preservar a aparência e a navegação existente, preparar o uso do novo banco Supabase e fornecer execução local isolada. Aplicar proteções locais e no CI contra arquivos de ambiente e padrões de segredos. Ao final, manter uma versão local executando para validação humana, antes de commits da implementação.

## User Stories

1. As a visitor, I want the existing landing page to keep its appearance, so that the migration does not change the product identity.
2. As a visitor, I want existing URLs to remain available, so that navigation and bookmarks keep working.
3. As a visitor, I want to open the authentication page, so that I can access my workspace.
4. As a new user, I want to register with email and password, so that I can create a private account.
5. As a registered user, I want to log in, so that I can reach the QR generator.
6. As a signed-in user, I want my session to survive a page refresh, so that I do not have to log in repeatedly.
7. As a signed-in user, I want to log out, so that another person using my browser cannot access my workspace.
8. As an anonymous visitor, I want protected pages to direct me to login, so that the access requirement is clear.
9. As a user, I want my account and data protected by server authorization, so that browser changes cannot bypass access control.
10. As a user, I want the current static QR preview to remain usable, so that the basic generator still works.
11. As a user, I want to create a tracked QR for a valid destination, so that scans can be counted.
12. As a user, I want tracked URLs generated on the application's own origin, so that new QR Codes do not depend on the old Supabase function.
13. As a user, I want to list only my QR Codes, so that other accounts cannot see my resources.
14. As a user, I want to remove one of my QR Codes, so that I can manage my existing resources.
15. As a user, I want basic scan analytics for my QR Codes, so that I can follow their usage.
16. As a user, I want another account to be unable to read, delete or request analytics for my codes, so that my information stays private.
17. As a QR scanner, I want a valid active code to redirect to its destination, so that the QR remains useful.
18. As a QR scanner, I want a missing or inactive code to produce an understandable error, so that I do not see an internal failure.
19. As a user, I want failures in optional location enrichment not to block redirection, so that the QR remains available.
20. As an operator, I want incoming public scan requests controlled, so that arbitrary client inserts cannot manufacture database rows directly.
21. As an operator, I want the database accessible only from the backend, so that connection credentials never reach the browser.
22. As an operator, I want a documented connection to a new Supabase Postgres project, so that the product can run under my own account.
23. As a developer, I want an isolated local Postgres, so that I can test without accessing production data.
24. As a developer, I want environment files ignored by Git, so that local credentials are not added accidentally.
25. As a developer, I want staged environment files and detected secrets rejected, so that accidental forced additions are caught before a commit.
26. As a repository owner, I want CI to check tracked files and credential patterns, so that protection also runs when local hooks are bypassed.
27. As a repository owner, I want the initial import to omit the old Git history, so that old environment files are not exposed by the new public repository.
28. As an operator, I want example configuration to use dummy values, so that setup instructions do not disclose actual credentials.
29. As a user, I want the existing language and theme behavior preserved, so that the migration remains familiar.
30. As a reviewer, I want a local URL and an unchecked manual checklist, so that I can validate the lot before it is committed.

## Implementation Decisions

- Use Next.js App Router with server runtime, TypeScript and the existing Tailwind/component design.
- Migrate the established landing, authentication, generator, QR listing and redirect routes. Replace React Router with Next.js navigation.
- Use Postgres through a server-only data layer. The proposed implementation uses Drizzle and a connection compatible with a new managed Supabase database.
- Use Better Auth for email/password and cookie-based sessions. Account, session, verification and business data belong to the new database; no browser Supabase client or dependency on the previous backend remains.
- Take ownership from the authenticated server session. Reject or ignore client-supplied ownership rather than trusting it.
- Define QR code and scan records with UUID identities, unique short codes, timestamps, active state, scan counts and ownership. Database changes are versioned and reproducible.
- Use a cryptographically secure short-code generator and rely on the unique constraint for collisions, with bounded retries.
- Expose authenticated QR list/create, delete and analytics operations. Expose a controlled public lookup/record/redirect operation with no-cache behavior and 302 redirection.
- Accept HTTP/HTTPS destinations for tracked browser redirects. Reject unsafe schemes without making outgoing requests to the destination.
- Treat forwarded headers as trustworthy only when deployment has explicitly configured the trusted proxy behavior; do not blindly trust arbitrary client-provided identity or location headers.
- Derive public tracking links from a configured application origin. Do not embed the old project identifier.
- Provide local Postgres configuration and migrations. Never run migrations against the old project or production without the corresponding credentials and authorization.
- Import only the required source and assets, excluding environment files, original history, generated files, dependencies and old backend configuration.
- Exclude environment files while allowing a dummy-only example. Install Git checks and CI checks that identify forbidden paths and secret patterns, reporting locations or rule names without printing secret values.
- Keep credentials private: database and authentication secrets must never use public environment prefixes or be imported into client code.
- Document that layered guardrails reduce accidental disclosure and cannot prevent intentional bypass of every protection.
- Keep the implementation uncommitted until the user completes the dvd-tests checklist. An empty bootstrap commit may establish the main branch without containing code or credentials.

## Testing Decisions

- Proposed seam 1: public HTTP interface, verifying behavior of sessions, protected access, QR CRUD, ownership isolation, scan analytics and redirection against a real isolated Postgres. Tests must not assert private functions or database implementation details.
- Proposed seam 2: public Git/command interface of the credential guardrail, using temporary repositories and synthetic credentials, never real values. Verify safe files pass and forbidden paths/patterns fail without echoing the values.
- The user explicitly approved both test seams, all three tickets and their blocking edges before implementation.
- There is no existing test suite in the source project. Introduce behavior-driven integration checks at the agreed boundaries rather than snapshots that mirror component internals.
- Use red-before-green per behavior, targeted checks during implementation and the complete automated suite at the end.
- Browser Drive verifies the visible application. Human login profiles are not invented; authenticated browser steps require an authorized profile or the user's own registration. Automated isolated API fixtures are disposable and not presented as a default login.
- Compare the inherited UI and important routes; test a relevant negative case such as anonymous access or an unknown QR code.

## Out of Scope

- Full editor fixes from R2, download expansion, translation completion, wizard, linkpage publishing, published digital cards, forms, billing, AI and third-party integrations.
- Importing real users or business records without an export and explicit target configuration.
- Keeping previously distributed Supabase URLs alive without access to the old function. Document the bridge strategy; do not claim those printed addresses were changed by this migration.
- Disabling the old project, production deployment, committing or pushing implementation before human validation, opening a PR or merging to main.
- Publishing actual database or login credentials, including default passwords in the repository or manual validation checklist.

## Further Notes

The user will create the new Supabase project. Local preparation does not depend on those credentials. GitHub Issues is the tracker inferred from the explicitly selected destination repository, with the `ready-for-agent` label requested by the invoked skills. Specification issue #1 and tickets #2–#4 were published with native blocking edges after user approval. This lot delivers a local implementation and reproducible database setup; production data migration remains dependent on exports and target configuration.
