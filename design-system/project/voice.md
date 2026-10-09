# Voice and copy

`brand-build` fills this file from the Voice and Audiences sections of `spec/client-spec.md`. Until then it holds the rules every client keeps and empty slots for what changes.

## Words the client already owns

- **Tagline**: client to provide.
- **Mantra**: client to provide. Always in quotes when quoted; Cinematic and Engineered use it as the values section title.
- **Values**: six, in the client's own words. Keep their capitalization.
- **Service names**: the client's own names, from the spec.
- **How they sound**: one sentence from the spec, such as "a foreman who respects your time".

## Rules

- Lead with the work: name the service, the place and the outcome, not an adjective about the company.
- Short sentences. One idea each. Hero subtext stays at 20 words or fewer; section intros at 25.
- Sentence case for headings and buttons in the copy itself. A concept's capitals come from CSS, so the words stay readable when styles are off.
- Numbers only when they are real and sourced. Anything the client has not confirmed renders as "Client to provide", never as a plausible guess.
- No em dashes or en dashes. Use a period, a comma, a colon or parentheses. Ranges use a hyphen or "to" ("3 to 6 months").
- No filler verbs (elevate, seamless, unleash, next-gen, revolutionize) and no invented slogans.
- Name places plainly. No weather, time or locale strips.

## Action labels

The labels live in `ctaIntents` in `design-system.json`; `npm run check` fails a page that mixes them with alternatives.

| Intent | Template label | Where it goes |
|---|---|---|
| Quote | Request a quote | Contact page, `#quote` |
| Call | Call (555) 010-0100, or the number alone | `tel:+15550100100` |
| Careers | View open roles | Careers page, open roles |
| Partner | Start an inquiry | Partner inquiry page |
| Learn | Our services / See our safety program / About us | The page named |

One label per intent across the whole site.

## Forms and errors

- Labels are nouns ("Project location"); hints say what good input looks like ("City and state, or the nearest cross streets").
- Errors say how to fix it: "Enter an email address like name@company.com", "Choose at least one service".
- Success says what happens next: "Thanks, your request is in. We will review the details and follow up."
