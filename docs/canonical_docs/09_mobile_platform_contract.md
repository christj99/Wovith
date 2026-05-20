# 09 — Mobile and Platform Contract

**Status:** Canonical  
**Purpose:** preserve Wovith’s mobile ambitions while preventing mobile from doubling v1 complexity.

## 1. Core decision

Mobile is for **wearing lenses** before **building lenses**.

The first mobile experience should let users check, refresh, inspect, and lightly calibrate lenses. Complex lens creation, DSL editing, marketplace behavior, and deep connector setup should start on web unless validated otherwise.

## 2. Stage plan

| Stage | Mobile posture |
|---:|---|
| 0 | No mobile. Web only. |
| 0.5 | No mobile unless needed for OAuth experiments. |
| 1 | Android shell optional; only if product strategy requires it. |
| 1.5 | Android beta if web alpha validates daily lens value. |
| 2 | Quick capture, notifications, basic voice input, richer mobile lens wearing. |
| 3+ | Widgets, lock screen, shared lenses, marketplace browsing. |

## 3. Android Stage 1 maximum scope

If Android is included in Stage 1, keep it narrow:

- lens list;
- stacked cell view;
- manual refresh;
- freshness/error states;
- “Why am I seeing this?” panel;
- pin/hide/mute;
- quick capture text note;
- simple NL cell request if already supported by web backend/adapter;
- connector status display.

Out of scope:

- full DSL editor;
- drag/drop canvas;
- marketplace;
- widgets;
- voice-first lens authoring;
- background autonomous agents;
- Android Auto;
- hidden local discovery;
- complex connector admin.

## 4. Mobile UX principles

### 4.1 Lenses become stacks

On mobile, a lens should become a vertical stack of cells. Preserve spatial identity with order, grouping, and familiar cell cards rather than trying to recreate desktop freeform layout.

### 4.2 Touch interactions

- Tap item → details/why.
- Long press → pin/hide/mute menu.
- Pull to refresh lens.
- Cell overflow → edit title, refresh, inspect DSL, disable.

### 4.3 Freshness is more important on mobile

Mobile users are often checking quickly. Every cell should make freshness obvious.

### 4.4 Mobile should not feel like a chat app

NL input is available for edits and questions, but the primary screen remains the lens.

## 5. Voice

Voice-first authoring is deferred.

Allowed earlier:

- speech-to-text as input into existing NL authoring;
- voice capture as a note;
- read-aloud summaries if accessible and useful.

Deferred:

- full voice workflow for lens construction;
- multi-turn voice repair flow;
- voice authoring of full lenses;
- in-car voice mode.

## 6. Notifications

Notifications can be useful, but they can also make Wovith feel intrusive.

Stage 2 earliest for broad notifications.

Rules:

- user chooses which cells can notify;
- notification budget per day;
- no notification from stale/untrusted AI output without clear labeling;
- no destructive action from notification without review;
- snooze/mute always available.

## 7. Widgets and lock screen

Widgets are attractive but should wait until cells are stable and useful.

Earliest stage: Stage 3 for polished widgets; Stage 2 experiment if a single daily lens is validated.

Widget constraints:

- read-only;
- no sensitive content by default;
- obvious freshness;
- tap opens lens/cell;
- no action execution from widget.

## 8. Quick capture

Quick capture is the strongest early mobile feature after lens viewing.

Stage 2:

- text capture;
- voice transcript capture;
- link/share-sheet capture;
- photo reference capture.

Captured items become local Wovith source data and can feed lenses.

## 9. Platform stack requirements

If using Capacitor 8, current official docs list modern requirements including:

- NodeJS 22+;
- Xcode 26.0+ for iOS development;
- Android Studio 2025.2.1+;
- Android `minSdkVersion = 24`;
- Android `compileSdkVersion = 36`;
- Android `targetSdkVersion = 36`.

Do not scaffold mobile until the team accepts the toolchain requirements and CI/build implications.

Research cross-reference: R-MOBILE-01, R-MOBILE-02.

## 10. Mobile security concerns

- Token storage must use platform secure storage.
- Share-sheet capture must show what is saved.
- Background refresh must respect battery, network, and budget constraints.
- Sensitive cells should support hide-on-lock or privacy screen behavior.
- Notifications must not leak sensitive content by default.

## 11. Mobile acceptance criteria

### Stage 1 optional Android

- User can open existing lens.
- User can inspect why an item appears.
- User can refresh.
- User can pin/hide/mute.
- User can see connector errors.
- No complex authoring required.

### Stage 2

- Quick capture works.
- Notifications are user-configured and budgeted.
- Mobile does not expose sensitive data by surprise.

## 12. Original mobile ideas and staging

| Original idea | Stage | Notes |
|---|---:|---|
| Voice-first authoring | 2+ | Start as speech input, not full workflow. |
| Share-sheet capture | 2 | Strong mobile use case. |
| Photo capture | 2 | Useful for life admin/research. |
| Notifications | 2 | Needs budget and trust controls. |
| Widgets | 3 | Only after stable cells. |
| Lock screen | 3 | Privacy-sensitive. |
| Context auto-swap | 3+ | Useful but easy to feel creepy. |
| Android Auto/CarPlay | 4 or cut | Not core unless a strong voice/capture case appears. |

## 13. Research cross-references

- Capacitor current requirements: R-MOBILE-01, R-MOBILE-02.
- Local storage/quotas: R-STORAGE-01, R-STORAGE-02.
- Privacy/security constraints: R-GOOGLE-02, R-LLMSEC-01.
