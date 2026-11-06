#!/usr/bin/env python3
"""Check a Hinglish script file for length, pacing and common problems.

Usage:
    python script_check.py SCRIPT.md [--wps 2.73] [--target-min 8] [--json]

Script format (see assets/script-template.md):
  - Paragraphs are marked by a bold ID line such as **P01**; the spoken text follows.
  - Lines starting with '>' are notes and are not counted.
  - Text in square brackets (for example [VERIFY]) is not counted.
  - '## HEADING' lines start a section; the first section is treated as the hook.
If no IDs are found, blank-line separated blocks are used as paragraphs.

The script reports; it never rewrites the file.
"""
import argparse
import json
import re
import statistics
import sys

DEV = re.compile(r"[ऀ-ॿ]")
ID_RE = re.compile(r"^\*\*(P\d+[A-Za-z]?)\*\*\s*$")
HEAD_RE = re.compile(r"^#{1,6}\s+(.*)$")

STOCK_PHRASES = [
    # English stock phrases and AI tells
    "let's dive in", "lets dive in", "in today's world", "in today's fast", "it's worth noting",
    "it is worth noting", "delve", "tapestry", "seamless", "holistic", "leverage", "robust",
    "welcome to", "welcome back", "don't forget to subscribe", "smash the like",
    # Hinglish stock phrases
    "toh chaliye shuru karte hain", "chaliye shuru karte hain", "aaj ke is video mein",
    "is video mein hum jaanenge", "aaj ki is duniya mein", "namaste dosto", "hello dosto",
    "namaskar doston", "swagat hai", "welcome dosto",
    "तो चलिए शुरू करते हैं", "आज के इस वीडियो में", "आज की इस दुनिया में",
    "नमस्कार दोस्तों", "नमस्ते दोस्तों", "स्वागत है",
]
GREETINGS = ["namaste", "namaskar", "hello", "hi guys", "hey guys", "welcome", "swagat", "dosto",
             "doston", "subscribe", "channel", "नमस्ते", "नमस्कार", "स्वागत", "दोस्तों", "चैनल"]
HEDGES = ["maybe", "perhaps", "probably", "shayad", "ho sakta hai", "andaza", "might",
          "शायद", "हो सकता है", "अंदाज़ा"]


def parse(path):
    text = open(path, encoding="utf-8").read().splitlines()
    paras, cur, cur_id, section = [], [], None, "START"
    sections_seen = []
    has_ids = any(ID_RE.match(l.strip()) for l in text)

    def flush():
        nonlocal cur, cur_id
        if cur_id is not None or (not has_ids and cur):
            paras.append({"id": cur_id or f"B{len(paras)+1:02d}", "section": section,
                          "lines": [l for l in cur if l.strip()]})
        cur, cur_id = [], None

    for raw in text:
        line = raw.rstrip()
        s = line.strip()
        m = HEAD_RE.match(s)
        if m and not s.startswith(">"):
            flush()
            section = m.group(1).strip()
            if section not in sections_seen:
                sections_seen.append(section)
            continue
        idm = ID_RE.match(s)
        if idm:
            flush()
            cur_id = idm.group(1)
            continue
        if has_ids and cur_id is None:
            continue  # header block before the first paragraph ID
        if not has_ids and not s:
            flush()
            continue
        cur.append(line)
    flush()
    return paras, sections_seen


def clean(lines):
    spoken = []
    for l in lines:
        s = l.strip()
        if not s or s.startswith(">") or s == "---":
            continue
        s = re.sub(r"\[[^\]]*\]", " ", s)
        s = re.sub(r"[*_`]", "", s)
        spoken.append(s)
    return " ".join(spoken).strip()


def words(s):
    return re.findall(r"[\wऀ-ॿ][\wऀ-ॿ'’.,%/-]*", s)


def sentences(s):
    parts = re.split(r"(?<=[.!?।…])\s+", s)
    return [p for p in parts if len(words(p)) > 0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--wps", type=float, default=2.73, help="words per second (default 2.73)")
    ap.add_argument("--target-min", type=float, default=None)
    ap.add_argument("--long-sentence", type=int, default=28)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    paras, sections = parse(a.path)
    if not paras:
        print("No paragraphs found. Use **P01** style IDs or blank-line separated blocks.")
        sys.exit(1)

    raw_all = open(a.path, encoding="utf-8").read()
    rows, all_text, all_sents = [], [], []
    t = 0.0
    for p in paras:
        txt = clean(p["lines"])
        w = len(words(txt))
        sec = w / a.wps
        sl = [len(words(x)) for x in sentences(txt)]
        rows.append({"id": p["id"], "section": p["section"], "words": w,
                     "seconds": round(sec, 1), "start": round(t, 1),
                     "sentences": len(sl), "text": txt})
        t += sec
        all_text.append(txt)
        all_sents.extend(sl)

    total_words = sum(r["words"] for r in rows)
    total_sec = total_words / a.wps
    full = "\n".join(all_text)
    low = full.lower()
    minutes = total_sec / 60 if total_sec else 1

    # hook = first section
    first_sec = rows[0]["section"]
    hook_rows = [r for r in rows if r["section"] == first_sec]
    hook_words = sum(r["words"] for r in hook_rows)
    hook_text = " ".join(r["text"] for r in hook_rows).lower()
    hook_first30 = " ".join(words(hook_text)[:30])

    flags = []
    if a.target_min:
        target_words = a.target_min * 60 * a.wps
        diff = (total_words - target_words) / target_words * 100
        if abs(diff) > 10:
            flags.append(f"Length is {diff:+.0f}% against the {a.target_min:g}-minute target "
                         f"({total_words} words vs about {target_words:.0f}). First drafts run 10 to 15% long.")
    if hook_words > 205:
        flags.append(f"Hook is {hook_words} words, about {hook_words/a.wps:.0f} s (aim 120 to 200 words, 45 to 75 s).")
    elif hook_words < 100 and len(hook_rows) < len(rows):
        flags.append(f"Hook is only {hook_words} words, about {hook_words/a.wps:.0f} s; check it carries a stake, a turn and a promise.")
    for g in GREETINGS:
        if g.lower() in hook_first30.lower():
            flags.append(f"Greeting or channel word '{g}' in the first 30 words of the hook.")
            break

    em = full.count("—") + full.count("–")
    if em:
        flags.append(f"{em} em or en dash(es) in spoken text (common AI tell; use a full stop or comma).")
    found = []
    for ph in sorted(STOCK_PHRASES, key=len, reverse=True):
        if ph.lower() in low and not any(ph.lower() in f.lower() for f in found):
            found.append(ph)
    for ph in found:
        flags.append(f"Stock phrase: '{ph}'.")
    long_sents = []
    for r in rows:
        for s in sentences(r["text"]):
            n = len(words(s))
            if n >= a.long_sentence:
                long_sents.append((r["id"], n, s[:90]))
    for pid, n, snip in long_sents:
        flags.append(f"{pid}: {n}-word sentence: \"{snip}...\"")

    # flow: how many body paragraphs open with a plain sequence word instead of a cause or a turn
    body = [r for r in rows if r["section"] != first_sec]
    weak = [r["id"] for r in body if re.match(r"^(phir|fir|aur|ab|uske baad|then|next)\b", r["text"].lower())]
    if body and len(weak) / len(body) > 0.25:
        flags.append(f"Flow: {len(weak)} of {len(body)} paragraphs open with a plain sequence word ({', '.join(weak[:8])}). "
                     f"Link parts with a cause or a question ('isliye', 'lekin', a question) so it reads as one story, not a list.")
    last = rows[-1]
    last_words = last["words"]
    if re.search(r"\b(like|subscribe|share|comment|channel|agla video|next video)\b", last["text"].lower()):
        flags.append(f"Ending: the last paragraph ({last['id']}) is a call to action or a next-video line. "
                     f"End on the callback and a 1 to 3 word beat; put the one soft ask before it.")
    if len(rows) >= 2 and last_words <= 6 and re.search(r"\b(like|subscribe|share|comment|channel|agla video|next video|agla sawaal)\b", rows[-2]["text"].lower()):
        flags.append(f"Ending: the call to action or next-video line ({rows[-2]['id']}) sits right before the closing beat. "
                     f"Put the callback to the hook between them so the last thing the viewer hears is the story, not the ask.")
    if last_words > 6:
        flags.append(f"Ending: the last paragraph ({last['id']}) is {last_words} words; the closing beat should be 1 to 3 words.")
    if len(rows) >= 3 and last_words <= 6 and rows[-2]["words"] < 8:
        flags.append("Ending: the last two paragraphs are both very short; make sure a callback line comes before the beat.")

    dev_text = bool(DEV.search(full))
    if dev_text:
        digits = re.findall(r"[0-9०-९]+", full)
        if digits:
            flags.append(f"Devanagari file contains {len(digits)} numeral(s) (e.g. {digits[:5]}); spell numbers in words for the voice tool.")

    verify = len(re.findall(r"\[VERIFY[^\]]*\]", raw_all, flags=re.I))
    questions = full.count("?")
    median = statistics.median(all_sents) if all_sents else 0
    mean = statistics.mean(all_sents) if all_sents else 0
    over25 = sum(1 for x in all_sents if x > 25)
    short = sum(1 for x in all_sents if x <= 4)
    hedges = sum(low.count(h.lower()) for h in HEDGES)

    summary = {
        "paragraphs": len(rows), "words": total_words, "seconds": round(total_sec),
        "minutes": round(total_sec / 60, 2), "wps": a.wps,
        "hook_section": first_sec, "hook_words": hook_words, "hook_seconds": round(hook_words / a.wps),
        "sentences": len(all_sents), "median_sentence": median, "mean_sentence": round(mean, 1),
        "over_25_words": over25, "punch_beats_4_or_fewer": short,
        "questions": questions, "questions_per_min": round(questions / minutes, 2),
        "hedge_words": hedges, "verify_tags": verify, "devanagari": dev_text,
    }

    if a.json:
        print(json.dumps({"summary": summary, "paragraphs": [{k: v for k, v in r.items() if k != "text"} for r in rows],
                          "flags": flags}, ensure_ascii=False, indent=2))
        return

    print(f"Script check: {a.path}")
    print(f"Speed {a.wps} words/s | {len(rows)} paragraphs | {total_words} words | about {total_sec/60:.1f} min ({total_sec:.0f} s)")
    print(f"Hook ('{first_sec}'): {hook_words} words, about {hook_words/a.wps:.0f} s")
    print(f"Sentences {len(all_sents)}: median {median:g} words, mean {mean:.1f}, over 25 words {over25}, punch beats (4 or fewer) {short}")
    print(f"Questions {questions} ({questions/minutes:.1f} per min) | hedge words {hedges} | [VERIFY] tags {verify}")
    print()
    print("| ID | Section | Words | Sec | Starts at |")
    print("|---|---|---|---|---|")
    for r in rows:
        m, s = divmod(int(r["start"]), 60)
        print(f"| {r['id']} | {r['section'][:34]} | {r['words']} | {r['seconds']} | {m}:{s:02d} |")
    print()
    if flags:
        print("Flags:")
        for f in flags:
            print(f"- {f}")
    else:
        print("No flags.")


if __name__ == "__main__":
    main()
