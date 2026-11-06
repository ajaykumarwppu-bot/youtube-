# QA checklist and anti-slop

Contents: the 21-point checklist, open-loop ledger, AI tells and fixes, Hinglish slop, prompt pattern for AI drafting, YouTube policy note.

## Checklist

Items with a source are sourced; unmarked items are INFERENCE.

| # | Check | Source or note |
|---|---|---|
| 1 | Hook proves the title's promise within the first 10 seconds, with no greeting, channel name or sponsor | OutlierKit (vendor) |
| 2 | Title, thumbnail and opening set the same expectation; the payoff arrives, ideally by about two-thirds | YouTube Help |
| 3 | Open-loop ledger: every question with a timestamp and where it closes; none dropped, none closed instantly; a fresh tease every few minutes | OutlierKit (vendor) |
| 4 | One idea per section, stated in one sentence | |
| 5 | Every sentence adds value, creates curiosity or advances the story; first draft trimmed 10 to 15% | River Editor, WordCounterTool (vendors) |
| 6 | "And then" links replaced by "but" or "therefore" | Parker and Stone, via The Hustle |
| 7 | Read aloud at pace; mark every stumble and every line you would not say to a friend | Typecast (vendor) |
| 8 | Register consistent; English word classes consistent; no formal Hindi where a daily word exists | |
| 9 | AI-tell scrub: em dashes, filler openers, hollow intros, triplets, hedges, buzzwords, announced transitions | Dynatrace style guide |
| 10 | Every number, date, name and quote has a primary source; as-of dates on volatile facts; artist's concepts and false colour labelled | |
| 11 | Each term defined once, then reused identically; each big number has one anchor | |
| 12 | Visual change planned every 5 to 10 seconds; no 30-second still; visuals add meaning, not duplicate narration | OutlierKit (vendor) |
| 13 | TTS pass: render fully, listen for English-word accent, numerals, abbreviations and odd pauses; update the pronunciation list | Sarvam docs |
| 14 | Timed render matches target length at the calibrated speed | |
| 15 | Sensitivity and legal read for named people, parties, communities and exam-stress content | |
| 16 | One soft call to action after the payoff, and a bridge to the next video | |
| 17 | Distinct thesis and treatment from the channel's other videos; synthetic-media disclosure checked | |
| 19 | Story, not a list: one central question, one through-line idea, three to five deep moments, each part handed over by a cause or a question; first-sentence flow test passes | User feedback, 2026-10-30 |
| 20 | No spoken chapter headings; on-screen cards only | User feedback, 2026-10-30 |
| 21 | Ending: answer, what is unknown, one soft ask, callback with a question or image for the viewer, 1 to 3 word beat; the last line is not a call to action | User feedback, 2026-10-30 |
| 18 | Post-publish: retention graph at 48 hours and 7 days; sharp early drop means rewrite the hook, mid slide means add loops and interrupts | OutlierKit (vendor) |

## Open-loop ledger (build for every script)

| # | Question or tease | Opened at (P-id, time) | Closed at | Notes |
|---|---|---|---|---|

A loop is legitimate if it is paid off, the payoff is proportionate to the build, the viewer's time is respected, facts are not distorted for tension, and the viewer could say "I am glad I watched." Justify loops by information-gap and anticipation, never by "unfinished tasks stay in memory": that Zeigarnik claim is contested.

## AI tells and fixes

From the Dynatrace style guide (written for documentation, applied to scripts):

- Em-dash asides. Use a full stop or a comma.
- Chatbot openers ("Certainly!", "Great question").
- Hollow intros about "today's fast-moving world".
- Padded triplets ("fast, efficient and reliable") where one word is enough.
- Hedging filler ("it is worth noting that").
- Flagged vocabulary: leverage, robust, seamless, holistic, delve, tapestry.
- Vague intensifiers (very, truly, incredibly) with no figure attached.
- Navigational transitions that announce the next section instead of making a turn.
- False balance ("on one hand, on the other") when the facts lean one way.

## Hinglish slop (INFERENCE)

- "Toh chaliye shuru karte hain", "Aaj ke is video mein hum jaanenge", "Aaj ki is duniya mein".
- A direct English-to-Hindi translation of a stock phrase.
- Every chapter ending with the same kind of question.
- "Yeh video aapke liye hai" as a standalone line.
- Over-use of "aakhir", "yaar", "bilkul" as filler.
- Stacked rhetorical questions with no answer between them.
- Sudden Sanskritised words.

## Prompt pattern for AI drafting (INFERENCE)

When drafting a section with a model: supply the thesis and section list yourself; paste 300 to 500 words of the user's own spoken-style writing as a voice sample; give a numbered verified fact sheet with the instruction to use only those facts and mark anything else `[VERIFY]`; set hard constraints (no em dashes, no triplets, no "let's dive in", a maximum sentence length, the chosen register and English word classes); draft one section at a time; request three alternative hooks and rewrite the chosen one by hand.

## Policy note (news reports; check the official YouTube page)

YouTube's stance as reported is that AI tools remain acceptable, but templated, mass-produced, low-value content loses monetisation. In July 2025, "repetitious content" was renamed "inauthentic content." A July 2026 clarification, reported with an effective date of July 16, names three non-monetisable categories: generic or template content easy to mass-produce, emotionally manipulative or upsetting content, and AI personas of real people discussing sensitive topics such as health, finance or legal matters. The defensible stance is visible human editorial contribution and a distinct thesis and treatment per video: a fixed format is fine, a topic-swapped template is the risk. Whether a stylised animation with an AI voice needs a synthetic-media disclosure must be checked on the current YouTube page.
