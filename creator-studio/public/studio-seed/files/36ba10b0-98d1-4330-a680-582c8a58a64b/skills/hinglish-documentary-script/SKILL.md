---
name: "hinglish-documentary-script"
description: Write, outline, review or revise YouTube documentary and explainer scripts in Hinglish (Roman for review, Devanagari for voice tools), especially space and science documentaries. Use this whenever the user asks for a script, hook, outline, chapter structure, voiceover text, "script likho", "hook likho", a script review or rewrite, a Devanagari version for a voice tool, word count or runtime planning, or says they have research notes and want a video script, even if they never say "skill" or name the format. Not for doing the research, writing visual or Flow prompts, shot lists, or building the video.
---

# Hinglish documentary script writer

This skill turns verified research into a spoken Hinglish script that holds attention and can go straight into a voice tool. It is built from a researched playbook (hooks, curiosity, structure, retention, AI-slop avoidance) and from close reading of eight reference transcripts: four Hindi or Indian-creator videos and four Kurzgesagt videos. The user's channel makes space documentaries first, and general documentaries (economy, education, problems, solutions) later.

## Scope

In scope: topic framing, outline, hook options, full script, review and rewrite, Devanagari conversion, word and runtime budgeting, fact flags, a QA pass.

Out of scope, handled by other skills the user is building: researching the topic, writing image or video prompts, shot lists, voice generation, and building the video. If the user wants those, say so in one line and hand back. Visual ideas in the script stay as short optional notes, never full prompts.

## Ground rules (and why)

- **Facts only from the research the user supplies.** Fluent Hinglish makes invented statistics sound trustworthy, so every number, date, name and quote must come from the fact sheet. Anything else gets a `[VERIFY]` tag instead of being guessed.
- **Never edit a locked script.** If a file is marked LOCKED or the user says it is locked, leave it alone and write changes to a new version only when asked.
- **One change request, one change.** The user often asks for small, specific edits. Change only that part, keep paragraph IDs stable, and say what was touched.
- **Learn patterns, never copy.** The reference videos show structure and technique. Do not reuse their sentences, analogies or jokes. Build new ones from this topic's own facts.
- **A script is a story, not a list of points.** One central question, one through-line idea, and every part handed to the next by a cause or a question. If the parts could be shuffled without anyone noticing, it is a list; rewrite it. Roman Hinglish is for reading; it must sound like someone telling a story to a friend.
- **Keep the promise.** The title, thumbnail and hook promise must be paid off. A loop that is never closed, or an alarm that is never calmed, loses viewers' trust and may breach YouTube's rules on manipulative content.

## Workflow

Run these steps in order. Skip a step only when the user has already supplied its output.

### 1. Intake
Check what you have: topic, research notes or fact file, target length, language, and any packaging (title, thumbnail idea). Ask only for what is missing, in one short message (use the question tool if available). Defaults when the user does not say: space documentary, 8 to 12 minutes, Roman Hinglish script plus a Devanagari voice version on request, one soft call to action at the end, no sponsor.

If there are no research notes, do not write the script from memory. Say so and ask for notes, or offer to hand the topic to the research step first.

Voice sample: if the user's earlier scripts are available (for example `Script_Parts_Hinglish.md` in the project), read about 300 to 500 words of them to match tone. Otherwise ask for a sample or use `references/hinglish-voice.md`.

### 2. Calibrate speed
Default speed is **2.73 words per second (about 164 per minute)**, measured from the user's own Roman Hinglish voiceover renders. A new voice or speed setting changes it, so ask for a 60-second render or a known word count and update the figure. Budget words with `scripts/script_check.py` (see below), not by feel.

### 3. Fact sheet
Write a numbered fact sheet from the research (`assets/fact-sheet-template.md`): fact, source, as-of date, confidence, and whether it is a figure to say aloud or show on screen. Mark artist's concepts, false-colour images, estimates and contested claims. The script cites fact numbers in its notes, so review is easy.

### 4. Promise and packaging
Write, in this order: the one-sentence ABT promise (And: the fact, But: the problem, Therefore: what this video delivers), the one question the viewer will want answered, a working title and the thumbnail's single strongest image. The hook echoes the title without repeating it word for word and proves the promise is real. Details: `references/hooks.md`.

### 5. Story spine, then outline
Before any outline, write the spine in five lines (see `references/structure-and-pacing.md`, "Story spine and flow"): the central question; the through-line idea that answers it (for example "rules written by hand never covered enough, then machines learned from examples"); a concrete opening scene or person; the three to five deep moments that carry the idea (not every milestone); and the last image that will be called back. Topics that are timelines (history of X, evolution of X) are the biggest risk: do not give each milestone its own chapter. Pick the moments that prove the through-line and cut the rest, even true ones.

Then outline. Choose the skeleton by length. Link parts by "But" and "Therefore", never "and then": each part ends on a question or a problem that the next part takes up. Chapter names are on-screen cards only (a year, a place, a short phrase) and are never spoken as headings. Give each part a word budget. Present the outline to the user before drafting a long script when they are present.

### 6. Hook options
Draft three hooks of about 45 to 75 seconds (roughly 120 to 200 words at the default speed) using different templates from `references/hooks.md`. Say in one line why each might work. Recommend one. If the user is present, let them choose; if not, use the recommended one and note the choice at the top.

Shape to aim for: a flat bold claim or concrete scene, a stake or emotion word, a turn, one number or teaser, one explicit promise or invitation. No greeting, channel name, sponsor or subscribe ask.

### 7. Draft chapter by chapter
Write as a story: scenes, people and consequences before statistics, and at most two or three facts per paragraph. A flashback that returns to the opening scene is a good shape. Write in short spoken sentences. Use the craft devices in `references/space-craft.md` (scale ladders, named actor, one analogy per hard idea, generous assumption then collapse, define once and reuse, mark speculation aloud). Place a fresh question or tease about every 1 to 2 minutes and a stronger re-hook about every 3 to 4 minutes; these are starting hypotheses to tune against the channel's own retention graph. Register and wording rules are in `references/hinglish-voice.md`.

### 8. Ending
The ending decides how the video is remembered. Do not end on a recap, a list of what was covered, or "ek baat aur" tacked on. Build it in this order, in four to six short paragraphs:
1. **Answer** the central question in two or three sentences, tied to the through-line (the reading, marked `[VERIFY]` when it is the script's own).
2. **What is still unknown**, in one honest line.
3. **One soft call to action**, one line, placed here and not at the very end.
4. **The callback**: return to the hook's own scene or phrase and hand the viewer a final question or image that is theirs to carry (for example the original test, put to the viewer). No new facts here, and no unsourced bridge to a next video.
5. **A closing beat** of one to three words.
The last spoken line is never the call to action or a next-video line. Sponsor or promo segments, if the user has any, follow the pattern in `references/observed-patterns.md`.

### 9. Check and fix
Run the script checker on the draft and fix what it flags, then walk the checklist in `references/qa-and-anti-slop.md`. Do the flow check: read only the first sentence of every paragraph; each one should follow from the one before by a cause, a turn or a question. If a part could be moved elsewhere unchanged, join it to its neighbours or cut it. Do the ending check against step 8. Build the open-loop ledger (every question, its timestamp and where it closes). Read the script aloud in your head at pace and rewrite any line the user would not say to a friend. Cut the first draft by about 10 percent: first drafts run long.

### 10. Deliver
Produce the files below, send them to the user, and save them to the project if a project is attached. Finish with a short note: runtime estimate, which hook was used, the `[VERIFY]` list, and the one decision the user still has to make. Do not recap the steps.

## Output files

Use `assets/script-template.md` for layout. Paragraph IDs `P01`, `P02`... in bold, one paragraph per voice chunk. Section headings are for editing only and are never spoken; an optional `> CARD:` note gives an on-screen card.

| File | Contents |
|---|---|
| `<slug>_script_ROMAN.md` | The script in Roman Hinglish with paragraph IDs, word counts, estimated time per part and `> VISUAL:` notes (optional, short) |
| `<slug>_fact_sheet.md` | Numbered facts with sources, as-of dates and `[VERIFY]` items |
| `<slug>_qa.md` | Checker output, open-loop ledger, checklist result, open questions |
| `<slug>_script_DEVANAGARI.md` | Only on request, or when the user is about to voice it. Rules in `references/hinglish-voice.md` |

## Script checker

`python scripts/script_check.py <script.md> [--wps 2.73] [--target-min 8]` reports words and estimated seconds per paragraph and in total, the hook length, sentence length, long sentences, questions per minute, em dashes, stock AI phrases, greetings in the hook, digits in a Devanagari file, `[VERIFY]` counts, paragraphs that open with a plain sequence word (a sign of list-style flow), and ending problems (a call to action or next-video line as the last paragraph, a closing beat longer than three words). Lines starting with `>` and text in square brackets are notes and are not counted as spoken. It never rewrites anything.

## Revising and reviewing

For "review this script": run the checker, the checklist, and the open-loop ledger, report what to change in priority order, and fix only what the user approves. For "make this paragraph shorter" or similar: edit only that paragraph, keep its ID, and re-run the checker on it. For a locked script: do not touch it.

## After publishing

When the user shares retention data, compare the first-30-second figure and the shape of the graph with the hook type used. A sharp early drop means rewrite the hook, a slow mid-video slide means add loops and re-hooks. Log the hook type and the result so the defaults here can be replaced by the channel's own evidence. The numbers in the references are mostly untested hypotheses, so the channel's results always win.

## Reference files

- `references/hooks.md`: hook anatomy, nine types, twenty templates, the alignment rule, mistakes.
- `references/structure-and-pacing.md`: skeletons for short, mid and long videos, word budgets, transitions, pacing.
- `references/space-craft.md`: scale and number handling, analogies, named actors, fact handling and uncertainty, writing for the ear.
- `references/hinglish-voice.md`: register, English and Hindi word classes, numbers, Devanagari conversion rules, voice-tool notes.
- `references/observed-patterns.md`: what eight reference videos did, and what to port.
- `references/qa-and-anti-slop.md`: the 21-point checklist, AI-slop list, a prompt pattern for AI drafting.
- `references/evidence-and-gaps.md`: what is firm, what is hypothesis, and the calibration loop.
