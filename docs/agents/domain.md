# Domain Docs

## Before exploring

Read root `GLOSSARY.md` and the ADRs under `docs/adr/` relevant to the work, when present. This is a single-context repository: no per-package glossary or GLOSSARY-MAP is required.

If these files do not exist, proceed silently. Do not suggest creating them upfront; the domain-modeling skill creates them lazily when terms or decisions are actually resolved.

## Layout

- `GLOSSARY.md`: shared domain vocabulary.
- `docs/adr/`: numbered architecture decision records.
- `docs/agents/`: engineering skill configuration, not domain decisions.

## Use the glossary vocabulary

Use defined terms in issue titles, specs, tickets, test names and code. Avoid synonyms the glossary explicitly rejects. If a term is missing, reconsider invented language or note a real gap for domain-modeling.

## Flag ADR conflicts

Surface conflicts with an existing ADR explicitly, with its identifier and the reason for reopening the decision. Do not silently override it.
