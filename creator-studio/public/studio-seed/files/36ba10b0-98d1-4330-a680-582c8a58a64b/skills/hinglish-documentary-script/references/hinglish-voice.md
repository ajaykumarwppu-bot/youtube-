# Hinglish voice and Devanagari conversion

Contents: sources and confidence, register, word classes, sentence habits, numbers, Devanagari conversion, voice-tool notes, mistakes.

Confidence labels: STATED (the user said it or their project files show it), OBSERVED (read in three Hindi caption files and one Indian-creator English transcript; small sample), OFFICIAL (vendor docs), INFERENCE (reasoned, untested). When this file conflicts with the user's own locked scripts or a voice sample they give, the user wins.

## Register

- Use **"aap" for statements about the viewer** and bare imperatives for invitations: "socho", "imagine karo", "dekho", "dekhna" (OBSERVED in three of three Hindi videos). Quoted speech inside a story may use "tum" if the speaker would. Do not drift mid-video into a different formality.
- First-person narrator is fine ("main bhi maanta hoon", "honestly") when the channel has a personal voice (STATED, user's earlier script). Kurzgesagt-style "hum" for the channel is also used (OBSERVED).
- The register is conversational, closer to how a friend explains over chai than to a textbook. Avoid Sanskritised Hindi where a daily word exists ("kintu", "tatha", "pratyek"). AI drafts drift toward formal or written-style Hinglish; watch for it (INFERENCE).

## Word classes (OBSERVED, INFERENCE for the exact line)

- **English for nouns and logic words:** technical and institutional nouns (gravity, event horizon, hypothesis, sample, data, system), units and organisation names. Logic connectors are often English too: so, but, actually, basically, eventually, roughly.
- **Hindi for emotion, reaction and verbs:** "hosh ud gaye", "dadi-nani", "katil", "chup-chaap", "dar", "hairaan".
- Define each English technical term once in plain words, then reuse it exactly.
- Idioms: use real Hindi idiom only when it is accurate and natural. Do not translate English idioms literally.

## Numbers and anchors

- Say **lakh** and **crore**, and convert a global figure once ("ek million, yaani das lakh"). Keep Indian digit grouping in written Roman text (5,00,000).
- Prefer Indian anchors that are accurate: a city's size, a train journey, a cricket pitch or boundary. Accuracy first.
- Round for the ear and show the exact figure on screen. In Roman text, write numbers as digits for review; in the Devanagari voice version, spell them in words (STATED rule from the user's existing Devanagari file).

## Sentence habits (OBSERVED)

- Median sentence 10 to 13 words in Hindi captions; about 5 to 7 percent over 25 words. Questions about 0.7 to 1.5 per minute in Hindi videos.
- Explicit signposting before the hardest idea: "yeh yaad rakhna", "simple language mein samajhte hain".
- Direct-address re-hook questions ("kabhi socha hai gangajal itne saal kharab kyun nahi hota?") at section turns.
- Personal sign-off is a channel choice; a like and subscribe ask only once, after the payoff.

## Devanagari conversion rules (STATED, from the user's existing file)

Produce the Devanagari file only when asked or when the user is about to voice the script.

1. Same words and same order as the locked Roman version. Do not edit content while converting.
2. English words stay in Latin script with correct spelling (school, system, data, video, problem).
3. Hindi words in Devanagari. Use sentence-ending danda (।) and question marks as in the user's file.
4. **All numbers and percentages are spelled in Devanagari words**, so the voice reads them correctly ("दो हज़ार चौबीस", "तीस दशमलव सात प्रतिशत"). Years too.
5. Keep paragraph IDs P01, P02... and section headings, so each paragraph can be copied into the voice tool and mapped to shots later.
6. End the file with a pronunciation-fix list for acronyms and awkward words. Voice tools read acronyms inconsistently, so give a respelling the user can paste: ASER as एसर, NCRB as एन-सी-आर-बी, GDP as जी-डी-पी, NEP as एन-ई-पी. Offer an alternative for any coined or awkward word.
7. Run the checker on the Devanagari file: it flags leftover digits.

## Voice-tool notes

- The user generated the voice in ElevenLabs with the Viraj voice (STATED), and found that long chunks of about 50 seconds (five paragraphs) sounded better than paragraph-by-paragraph clips (STATED). Write paragraphs that read well alone, but plan for them to be voiced in groups of about five.
- ElevenLabs documentation: ellipses add weight, dashes create short and inconsistent pauses, SSML break tags are not supported on the current v3 and v4 models, numbers should be written as they should be spoken, names can be fixed with IPA, respelling or a pronunciation dictionary, speed ranges from 0.7 to 1.2 (OFFICIAL vendor docs; verify current model names).
- Sarvam documentation: write Hindi in Devanagari and English words in Latin, keep number preprocessing on, use Indian grouping, end Devanagari sentences with the danda, use ellipses sparingly (OFFICIAL, one vendor). The user chose ElevenLabs over Sarvam, so treat this as supporting evidence only.
- Test one real mixed sentence in the chosen voice for accent leakage on English words before committing to a master version.
- Keep a pronunciation list for recurring names and update it after every full render.

## Common mistakes

- Switching register mid-script or sliding into textbook Hindi.
- English filler openers translated into Hindi ("toh chaliye shuru karte hain", "aaj ke is video mein hum jaanenge", "aaj ki is duniya mein").
- Over-balanced "ek taraf... doosri taraf..." when the facts lean one way.
- Inventing a statistic because it sounds right in Hindi. Use only the fact sheet.
- Joke translated word for word. Translate the job the joke does.
- Digits left in a Devanagari voice file.
