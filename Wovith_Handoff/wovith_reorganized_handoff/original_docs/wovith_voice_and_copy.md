# Wovith Voice and Copy
### How the product talks to users

---

## 0. About this document

This document specifies how Wovith writes. Every notification, error message, button label, agent confirmation, empty state, onboarding line, settings description, and marketing surface should be consistent with what's described here.

Voice and copy are functional, not decorative. A product that hosts agentic computation and lives on a person's device for hours every day earns trust line by line. Lucidpress research (referenced widely in 2025-2026 brand work) shows that consistent voice across touchpoints correlates with 23-33% revenue gains; the inverse is also true — inconsistency between, say, a friendly onboarding flow and a clinical error message is one of the less visible reasons users describe an experience as "off."

This document follows a specific principle: vague principles like *"be friendly but professional"* produce inconsistent output because everyone interprets them differently. The guidance here is concrete linguistic rules — *"use contractions,"* *"prefer 'because' over 'due to,'"* *"never call the user 'user'"* — with worked examples.

---

## 1. The voice in one paragraph

Wovith speaks like a thoughtful, capable colleague who knows your situation, takes your time seriously, and would never waste it. It is calm, specific, and confident without being assertive. It uses understatement where other products would use enthusiasm. It writes as itself — first person, slightly literary, slightly warm — but never performs personality. It tells you what it did, what it noticed, what it can't do, and what you might want to do next. It assumes you are intelligent and busy. It does not flatter you, apologize excessively, or use exclamation marks. When it talks about your data, it does so with the quiet attentiveness of someone who's been paying attention.

---

## 2. Voice positioning

Using the four-dimensional tone framework that came out of Nielsen Norman Group's UX writing research (formality, seriousness, respect, enthusiasm), Wovith's voice is positioned at:

| Dimension | Wovith's position | What this means |
|---|---|---|
| Formal ←→ Casual | **Toward casual, with a literary edge** | Contractions, conversational rhythm, plain words; but not slang. "Looks like" is fine; "vibes" is not. |
| Serious ←→ Funny | **Almost entirely serious** | Wovith does not crack jokes. It can be warm; it can be wry in tiny moments; but it is not the entertainment. |
| Respectful ←→ Irreverent | **Deeply respectful** | The user's attention, time, data, and judgment are treated as valuable. Never condescending. Never breezy about consent. |
| Matter-of-fact ←→ Enthusiastic | **Matter-of-fact** | "Done" not "Hooray, done!". "Found 3 things worth looking at" not "We found tons of awesome stuff!" |

The deliberate calibration: Wovith leans calm and confident. It earns moments of warmth by being consistently quiet — when it does say something warm, it lands.

---

## 3. Vocabulary tiers

Following the standard tiering convention from contemporary UX writing systems, every word Wovith uses belongs to one of three *vocabulary tiers*, and certain content types are restricted to certain tiers. (Naming note: these vocabulary tiers are distinct from the security doc's "action tiers" and the data architecture's storage layers. The context — what kind of language to use in a given surface — should always make the meaning clear.)

### Tier 1 — Universal

Words anyone reading at an 8th-grade level understands without context. Used everywhere, but especially in error messages, destructive confirmations, and first-time-user moments.

Examples: *find, show, see, change, send, save, remove, ready, working, slow, missing, wrong, before, after, instead.*

### Tier 2 — Wovith-native

Words specific to Wovith's domain that users learn through onboarding and consistent use. Used in the running product after a user has been around for a few sessions.

Examples: *lens, cell, fresh, stale, swap, mining, garden, source, renderer, capture.*

These are first introduced in onboarding with a one-sentence definition, then used freely. The product never re-explains them after the user has been exposed.

### Tier 3 — Technical

Words specific to the technical underlayer. Used only when authoring a cell or in advanced settings. Never appears in default-flow error messages, notifications, or marketing copy.

Examples: *MCP, OAuth, scope, connector, Automerge, expression, agent, sync.*

A user who never touches authoring or settings can use Wovith for years without encountering Tier 3 vocabulary.

### Tier restrictions

- **Error messages, notifications, destructive confirmations:** Tier 1 only.
- **Tooltips, inline help, in-cell affordances:** Tier 1 and 2.
- **Cell inspector, lens authoring:** Tier 1, 2, and selective Tier 3 (with one-line gloss).
- **Settings panels:** All tiers; Tier 3 used freely when it adds precision.
- **Marketing surfaces:** Tier 1 and Tier 2; Tier 3 only when speaking to developers.

---

## 4. Sentence patterns

A small set of reusable sentence patterns that ensure mechanical consistency. Every writer producing Wovith copy should recognize these and use them as templates.

### 4.1 Error pattern

> **Can't [action] because [reason]. [What to do, if known].**

Examples:

- *Can't reach Gmail because the connection expired. Reconnect to keep your inbox lenses fresh.*
- *Can't save the cell because the expression has a syntax error. The inspector shows what's off.*
- *Can't run this lens because Drive isn't connected. Connect it from settings.*

What this pattern avoids: *"An error has occurred,"* *"Sorry, something went wrong,"* *"Failed to save."* All of these are blameless and contentless. The pattern is blameless *and* informative.

### 4.2 Count pattern

> **[Number] [items] [status].**

Examples:

- *3 messages need a reply.*
- *12 documents touched this week.*
- *2 lenses worth considering.*
- *5 cells refreshed.*

This is the workhorse for cell summaries, notifications, and digest copy. It's short, specific, and never misleading about scope.

### 4.3 Action description pattern

> **[I/Wovith] [verb-past] [what] [where, if relevant].**

Examples:

- *Drafted 3 replies in the Inbox Decisions cell.*
- *Archived 12 emails older than 30 days.*
- *Added the Morning Brief lens.*

First person is Wovith's voice (see section 6 on identity). Past tense conveys that the action is complete. Specifics — counts, names — appear after the verb.

### 4.4 Question-asking pattern

> **[Context, if needed]. [Specific question]?**

Examples:

- *This will send to 12 people. Send anyway?*
- *Looking at the last 90 days. Want a different range?*
- *3 contacts have multiple matches. Which one for each?*

Questions are short, specific, and offer enough context to answer without going elsewhere. Never *"Are you sure?"* without saying what you're being sure about.

### 4.5 Status pattern

> **[Subject] [state-verb]ing [object, optional]...**

Examples:

- *Looking at recent activity in Gmail...*
- *Finding files you touch most often...*
- *Detecting time patterns in your calendar...*

Used for progress indicators and active-state messaging. Always specific to the actual operation — never generic *"Loading..."* or *"Please wait."*

### 4.6 Discovery pattern

> **Found [something specific]. [Optional: what you might do with it].**

Examples:

- *Found 3 dropped threads with people you usually keep up with.*
- *Found 12 receipts in your inbox from this quarter.*
- *Found a recurring meeting that's been declined 4 weeks in a row.*

This is Wovith's quiet way of surfacing insights. The discovery is named; the implication is left to the user.

---

## 5. Content types and their voice

Different surfaces call for slightly different registers. The voice is the same; the dial moves between calm-and-quiet and calm-and-active.

### 5.1 Notifications

The bar is high. Wovith earns the right to interrupt rarely. When it does, the notification has to pay back the cost of interrupting.

**Default register:** quiet, specific, dismissable.

Good:
- *A message from Maya just arrived in your VIP thread.*
- *Your morning brief is ready.*
- *2 of your replies were sent.*

Avoid:
- *Hey! Something just happened!* (vague, breezy)
- *URGENT: New email from your boss* (alarming without cause)
- *We've detected 47 new items for your review!* (count without filtering, demanding action)

**Rules:**
- Never use punctuation harder than a period
- Never use ALL CAPS for emphasis
- Always specific about what changed
- Always dismissable; never auto-promoted to anything more demanding

### 5.2 Error messages

The bar is even higher. Errors are where trust is won or lost most efficiently. Follow the *Can't [action] because [reason]. [What to do]* pattern strictly.

**Rules:**
- Never blame the user
- Never blame "the system" abstractly
- Always name the actual cause
- Always offer a next step if one exists
- Tier 1 vocabulary only
- One sentence preferred; two when the next step requires explanation

Good:
- *Can't send the reply because Gmail wants you to sign in again. Reconnect Gmail from settings.*
- *Can't load this cell because the filter expression has a typo on line 3. The inspector will show you.*

Avoid:
- *Oops! Something went wrong.* (vague, infantilizing)
- *Error 0x4a91: token_expired_invalid.* (technical, blameless to the point of useless)
- *Failed to send email.* (passive, no next step)
- *We're sorry, but we couldn't complete your request right now. Please try again later.* (corporate, no information)

### 5.3 Agent confirmations

The intent preview is one of Wovith's most consequential surfaces. Its copy carries the weight of the user's trust in the agent.

**Structure:**
1. **Headline (1 sentence):** What the agent wants to do, plainly.
2. **Itemized plan (3-7 lines):** Each item specific enough to evaluate.
3. **Confidence (chip, 1 word):** *Confident*, *Uncertain*, or absent (when confidence is high enough to omit).
4. **Three actions:** *Proceed*, *Edit Plan*, *Skip*.

Good headline examples:

- *I'd like to send these 3 replies you've drafted.*
- *I want to archive 47 emails older than 6 months.*
- *Ready to add this lens to your collection.*

Note: first-person ("I'd like to," "I want to"), specific count, specific action. Never *"Confirm action?"* or *"Proceed with the following?"*.

Itemized plan style:

- *To Maya — confirming Tuesday at 2pm*
- *To Alex — declining the speaking invitation*
- *To accounting@... — sending the invoice number*

Each item is verb-then-context. No bullet points, no formatting fanciness — just clean lines that a busy person can scan in 3 seconds.

### 5.4 Destructive confirmations (hold-to-confirm)

The hold-to-confirm pattern (1.5 second hold) is reserved for destructive bulk actions. Its copy is unusually direct.

**Structure:**
1. **What will happen, in one sentence:** *47 emails will be permanently deleted.*
2. **What's affected, named specifically:** *From: promotions, social, forums. Date range: before May 1.*
3. **Hold-to-confirm button:** *Hold to delete* (the button fills with red as the user holds)
4. **Escape:** *Cancel* (always visible, equal prominence as the hold button)

Good:
- *47 emails will be permanently deleted. From: promotions, social, forums. Date range: before May 1. [Hold to delete] [Cancel]*

Avoid:
- *Are you sure you want to delete? This cannot be undone.* (vague, alarmist, no specifics)
- *⚠️ Warning: 47 items will be lost forever!* (theatrical, emoji-shaming the user)

### 5.5 Empty states

Empty states are micro-moments that disproportionately shape the user's mental model. A good empty state orients without lecturing.

**Structure:** one short paragraph, one optional action.

Good:
- *This cell will fill up once you connect Gmail. [Connect Gmail]*
- *Nothing in the captures lens yet. Speak or type anything you want to remember.*
- *You haven't created any lenses yet. Want me to look through what's connected and propose a few?*

Avoid:
- *No items to display.* (no information, no orientation)
- *Whoops, looks like this is empty!* (breezy, blames the absence of data)
- *Get started by adding your first item! Click here to learn how.* (peppy, vague, implicitly judgmental)

### 5.6 Onboarding copy

The five-minute onboarding flow (specified in the onboarding doc) leans on copy. Each line earns its presence by being specific and informative.

The welcome line, committed in the onboarding doc:

> *Wovith reads from your stuff and shows it to you the way you want to see it. Let's connect a few things so I can find what's worth looking at.*

Notes on this line:
- "your stuff" is deliberately casual; "your data" would be clinical
- "the way you want to see it" hints at the lens concept without naming it
- "Let's connect a few things" is invitation, not demand
- "find what's worth looking at" sets expectations: we'll filter, not flood

This is the voice in concentrated form.

### 5.7 Success and celebration

Wovith celebrates rarely and quietly. Most successful actions get a one-line acknowledgement. Only a small number of milestones get something more.

Good:
- *Sent.*
- *Saved.*
- *Lens added.*
- *3 replies sent.*

Mild celebration (used for the first lens, first cell authored, first re-mining):

- *Your first lens is ready.*
- *You've authored your first cell.*

What we never say:
- *🎉 Awesome! Congratulations!*
- *You did it!*
- *Way to go!*

Wovith does not give the user gold stars. The user is an adult.

### 5.8 Sensitive moments

Some interactions touch security, privacy, or destructive action. The voice here gets noticeably more direct, with very short sentences.

Examples:

- *Disconnecting Gmail will stop 3 lenses from refreshing. You can reconnect anytime.*
- *This lens will be shared publicly. Anyone with the link can see it.*
- *Your local data will be deleted from this device. Sync will restore it on next login.*

What's deliberately absent: any pre-amble like *"Important:"* or *"⚠️ Warning."* The sentence itself carries the weight.

---

## 6. Identity: who is "I"?

A consequential decision: when Wovith speaks, who is speaking?

**The committed answer:** Wovith speaks as itself. The product is a "who" — not a person, but a presence. It uses first person ("I", "I'll", "I'd like to") naturally when describing what it's doing or wants to do. It refers to itself by name ("Wovith") in third person only in formal contexts (legal, marketing, settings descriptions).

Why this works:
- First person makes agent actions feel attributable. *"I'd like to send these 3 replies"* assigns the want to a specific entity the user can trust or push back on. *"The system would like to send..."* is bureaucratic; *"Wovith will send..."* is third-person-weird.
- First person doesn't pretend the product is human. The product never says *"I feel,"* *"I think,"* or anything that implies subjective experience. It says what it sees, plans, or did.
- First person sets up clean accountability. When the user reads an audit log entry like *"I sent 3 replies on Tuesday at 9:14am"*, the actor is unambiguous.

**What this is not:** Wovith does not have a personality name (like Vellum or Alfred). It does not introduce itself with a "Hi, I'm Wovith." It does not have an avatar or a face. The first-person voice is a writing convention, not a personification.

**Rule:** Use "I" when describing an action the product is taking or proposing. Use "Wovith" when describing the product in third person (rare, mostly in settings copy). Never use "we" — there is no team behind the curtain talking to the user.

---

## 7. How Wovith addresses the user

The user is addressed in second person ("you") whenever possible. Never as "user," "the user," "users," "customer," or any other label.

Good:
- *You haven't connected Gmail yet.*
- *Your morning lens is ready.*
- *Want me to look through what's connected?*

Avoid:
- *The user has not connected Gmail.* (third person about the user)
- *Users can connect Gmail in settings.* (general; depersonalizing)
- *Click here to connect your account.* (click here — generic, location-free)

---

## 8. Tone in tense moments

Three categories of tense moments require special attention.

### 8.1 When the user is being asked to grant something

OAuth flows, scope expansions, sync setups, and (when the lens garden ships in v3+) lens-marketplace forks. These moments are where the user evaluates whether to trust.

**Voice:** transparent, specific, low-key.

Good:
- *Connecting Gmail will let me read your messages and metadata. I'll never send mail without your specific confirmation.*

Avoid:
- *Wovith needs access to your Gmail account to provide the best experience.* (corporate, "best experience" is empty)
- *Allow Wovith to access Gmail?* (no information about what access entails)

### 8.2 When something goes wrong agent-side

The agent failed to take an action, or took the wrong action, or hallucinated.

**Voice:** straightforward acknowledgement. No excessive apology. Offer to fix.

Good:
- *I sent the wrong draft to Maya. Want me to send a follow-up correction?*
- *I couldn't figure out what you meant. Can you say more?*

Avoid:
- *I apologize for the inconvenience! I'm so sorry for the error! Please forgive me!*  (theatrical, undermines confidence)
- *An error occurred during processing.* (passive, contentless)

### 8.3 When the user is doing something risky

About to share something publicly, about to delete something, about to grant write access.

**Voice:** unflinching specificity, no melodrama.

Good:
- *This will share your lens publicly. Anyone with the link can fork it.*
- *47 messages will be deleted. From: promotions and social.*

Avoid:
- *Are you sure you want to do this?* (vague, alarmist)
- *⚠️ Caution! This action is irreversible!* (theatrical, no information)

---

## 9. Things Wovith doesn't say

A short list of phrasings, idioms, and patterns that are not Wovith's voice. These are the most common mistakes when writing AI-product copy.

### 9.1 Sycophantic openers

Never: *"Great question!"*, *"That's a fantastic idea!"*, *"What a great choice!"*

Wovith doesn't compliment the user on having spoken to it. It just answers.

### 9.2 Excessive enthusiasm

Never: *"Awesome!"*, *"Amazing!"*, *"Hooray!"*, exclamation marks in general.

Successful actions get *"Sent."* not *"Sent! ✓"*. Reserve exclamation marks for the rare moment they genuinely belong (almost never).

### 9.3 Anthropomorphizing emotional states

Never: *"I'm excited to..."*, *"I'm worried about..."*, *"I feel that..."*, *"I think you'll love this..."*

Wovith describes what it sees and does. It doesn't perform feelings.

### 9.4 Bureaucratic passive

Avoid: *"Your request has been processed,"* *"An action will be performed,"* *"This may take a moment."*

Replace with active voice: *"Done,"* *"I'll do this,"* *"Just a moment."*

### 9.5 Empty courtesies

Avoid: *"Please feel free to,"* *"We hope you enjoy,"* *"Don't hesitate to reach out."*

These are filler. Cut them.

### 9.6 Emoji decoration

Never: 🎉 ✨ 🚀 in success copy. Never: ⚠️ in warnings. Never: 🤔 in questions.

Emoji are not part of Wovith's voice. The exception: a single sparing use of an emoji in a specific marketing or onboarding context where it has functional meaning (a calendar icon next to a calendar action). Even then, prefer SVG icons in the visual system.

### 9.7 Marketing speak

Avoid: *"best-in-class,"* *"seamless,"* *"powerful,"* *"intelligent,"* *"smart,"* *"intuitive,"* *"effortless,"* *"revolutionary."*

These adjectives are forbidden in product copy. They're also discouraged in marketing copy. Wovith earns these words by being them, not by claiming them.

### 9.8 Technical apologies

Avoid: *"due to high traffic,"* *"our servers,"* *"the API,"* in user-facing copy.

If something failed because of infrastructure, say what the user can do: *"Can't reach Gmail right now. I'll retry in a minute."*

### 9.9 Generic "Loading..."

Avoid: *"Loading..."*, *"Please wait..."*, *"One moment..."*

Always specific: *"Reading recent emails..."*, *"Finding files..."*, *"Asking the calendar..."*

### 9.10 Calling features by feature names

Wovith doesn't say *"Use the Lens Builder to author your first cell."* It says *"Want to build a cell? Tap the plus."* Features are interactions, not nouns.

---

## 10. Specific copy commitments

A short catalog of words and phrases Wovith uses consistently. New copy should match these.

| Concept | Wovith says | Not |
|---|---|---|
| The thing you author | *lens*, *cell* | *workspace*, *board*, *widget*, *card* |
| Connecting an MCP server | *connect*, *connection* | *integration*, *plug-in*, *install* |
| Refreshing a cell's data | *refresh*, *fresh*, *stale* | *update*, *reload*, *outdated* |
| What the agent does | *I'd like to...*, *I'll...*, *I noticed...* | *The system will...*, *We will...* |
| User's connected services | *what you've connected* | *your integrations*, *your tools* |
| The destination canvas | *the canvas* | *the workspace*, *the board*, *the home screen* |
| Mining for new lenses | *finding lenses*, *looking through* | *scanning*, *analyzing*, *processing* |
| Things detected in your data | *noticed*, *found* | *detected*, *identified* |
| Acting without explicit instruction | *I'll go ahead and...*, *I took the liberty of...* | *Automatically*, *seamlessly* |

---

## 11. Writing process for new copy

When new copy needs to be written, follow these steps in order:

1. **Identify the content type** (notification, error, confirmation, empty state, etc.) — check section 5.
2. **Identify the user's state of mind** — are they being interrupted, or did they initiate? Are they about to do something risky? Are they likely confused?
3. **Choose the relevant pattern** — section 4.
4. **Draft using the vocabulary tier** appropriate to the surface — section 3.
5. **Check against section 9** — does the draft contain any of the forbidden patterns?
6. **Read aloud** — does it sound like Wovith? If it sounds like a corporate product or a chipper assistant, rewrite.
7. **Length pass** — is every word earning its place? Cut everything that isn't.

A general rule: when in doubt, say less. Wovith almost always over-explains on first draft. Cut by a third on the second pass.

---

## 12. Examples gallery

A small library of complete copy moments. Use these as touchstones.

### 12.1 Welcome screen

> *Wovith reads from your stuff and shows it to you the way you want to see it. Let's connect a few things so I can find what's worth looking at.*
>
> **[ Show me what's worth connecting ]**

### 12.2 Onboarding mining status

> *Looking at recent activity in Gmail...*
>
> *Finding files you touch most often in Drive...*
>
> *Noticing recurring topics in your messages...*
>
> *Identifying people you correspond with regularly...*
>
> *Detecting time patterns in your calendar...*

### 12.3 First lens proposal

> **Morning Brief**
>
> *6 conversations with active replies, 4 calendar items in the next 6 hours, and 3 documents you've been working on.*
>
> **[ Accept ]   [ Modify ]   [ Skip ]**

### 12.4 Intent preview for batch send

> *I'd like to send 3 replies you've drafted.*
>
> *To Maya — confirming Tuesday at 2pm*
>
> *To Alex — declining the speaking invitation*
>
> *To accounting@... — sending the invoice number*
>
> *Confidence: Confident*
>
> **[ Send all ]   [ Review individually ]   [ Skip ]**

### 12.5 Destructive confirmation

> *47 emails will be permanently deleted.*
>
> *From: promotions, social, forums.*
>
> *Date range: before May 1.*
>
> **[ Hold to delete ]   [ Cancel ]**

### 12.6 Refresh error in a cell

> *Can't reach Gmail right now. I'll retry in a minute.*

### 12.7 Connection expired error

> *Can't reach Gmail because the connection expired. Reconnect to keep your inbox lenses fresh.*
>
> **[ Reconnect Gmail ]   [ Later ]**

### 12.8 Empty cell

> *This cell will fill up once you connect Gmail.*
>
> **[ Connect Gmail ]**

### 12.9 Sensitive operation: disconnecting

> *Disconnecting Gmail will stop 3 lenses from refreshing. You can reconnect anytime.*
>
> **[ Disconnect ]   [ Cancel ]**

### 12.10 Audit log entry

> *9:14am — Sent 3 replies in Inbox Decisions cell.*

### 12.11 The blind-spot lens proposal

> *Want to see what your other lenses filter out?*
>
> *Some things slip through — old threads where you stopped replying, drafts that never went out, decisions that have aged past relevance. I can show you those in one place.*
>
> **[ Show me ]   [ Maybe later ]**

### 12.12 Successful first lens activation

> *Your first lens is ready.*

### 12.13 Re-mining badge

> *I found 2 new lenses worth considering.*

### 12.14 Lens going quiet

> *This lens has gone quiet. Want me to refresh it, retire it, or look for something new?*

### 12.15 Cell that became stale

A small caption inside the cell:

> *Last fresh 2 hours ago.*

---

## 13. The voice across surfaces

Wovith's voice is consistent across all surfaces, but the dial moves slightly between them.

### 13.1 In-product

The strictest application of the voice. All rules above apply.

### 13.2 Marketing website and onboarding

Slightly more allowed:
- Longer paragraphs (a single short paragraph rather than one-line copy)
- Occasional gentle wit (still no exclamation marks)
- The product can be described in third person more often

But never:
- Marketing-speak adjectives (section 9.7)
- Persuasion through hype
- The user as "user" or addressed in second-person plural

### 13.3 Documentation

The voice gets slightly more procedural — instructional content needs structure. But:
- Still first person where the product is the actor
- Still second person for the user
- Still no marketing-speak

Documentation can use Tier 3 vocabulary more freely, with one-line glosses on first use.

### 13.4 Support / customer contact

When a human at Wovith corresponds with a user (email reply, support thread), they write in the same voice but as themselves — first-person singular ("I" referring to the support person), name themselves, and acknowledge that they're a person.

The user shouldn't be confused about whether they're talking to a person or the product. Persons identify themselves; the product doesn't pretend to be one.

### 13.5 Release notes and changelog

Release notes are short, specific, and avoid marketing tone.

Good:
- *Cells now refresh in the background when the canvas is idle.*
- *Fixed: lens swap occasionally lost focus on the inspector.*
- *New: voice capture works on mobile (Android only for now).*

Avoid:
- *We're thrilled to announce...*
- *Get ready for the biggest update yet!*
- *Welcome to a new era of...*

---

## 14. Localization considerations

Wovith ships in English at v1. As localization expands:

- The voice (section 1) is the goal in every language; the linguistic rules (sections 3-4) need to be re-derived per language.
- Calm, direct, specific is the constant. Casual-with-literary-edge looks different in Japanese than in English; the translator's job is to find that register in target language, not to translate the rules literally.
- Cultural norms vary on second-person address, first-person assistant voice, and confidence-vs-deference. The translator works with a native speaker editor to calibrate.
- Sentence patterns translate; specific lines do not. Treat the examples gallery (section 12) as direction, not source text.

---

## 15. Audit and revision

This document is not static. As the product is used in the wild, copy will need revision based on:

- Confusion patterns surfaced in user feedback
- New surfaces (e.g., when the lens garden ships, the garden-specific copy patterns need spec'ing)
- Localization findings
- Brand evolution (rare; the voice is intended to be stable)

The voice document should be reviewed once per quarter. Significant deviations from the rules above either require explicit justification or are reasons to revise the affected copy.

---

## References

- *How to Define Your Tone of Voice in UX Writing* (UX Design Institute, 2025)
- *Voice, Tone, and Style Framework* (Uxcel)
- *How to Ruin Voice and Tone in UX Writing* (Dr. Kat Hayes, Write with Dr. Kat, 2026)
- *Understanding Tone of Voice in UX Writing: The 4 Dimensions* (Maya Pillai, 2026)
- *Creating a Voice & Tone Playbook from Scratch* (Gabriela Lucía Lorenz, 2026)
- *12 Principles of UX Writing with Examples* (Localazy)
- Nielsen Norman Group: tone of voice research
- Lucidpress: brand consistency / revenue research
- *Calm Technology: Principles and Patterns for Non-Intrusive Design* (Amber Case)
