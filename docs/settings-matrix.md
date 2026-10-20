# Settings matrix: where every setting lives, what it changes, how it is proven

Rule of thumb: **per profile** = stored in the IndexedDB `profiles` row (`Profile` in `src/store/profileTypes.ts`), so a
different person on the same device has their own value. **Per device** = `localStorage["gapimiz.device"]`
(`src/store/device.ts`), shared by all profiles. Both are applied to the page by `src/app/useApplyTheme.ts`
(html attributes and CSS variables) or read at the moment of use (`getProfile()` / selectors).

Every row is proven in `e2e/settings.spec.ts` (real UI: adult gate held 1.5 s, change the control, open the place where it
matters, assert, reload, switch profile). Run: `E2E_BASE_URL=http://localhost:5262/ npx playwright test e2e/settings.spec.ts --project=desktop`.
Unit tests are named where they exist.

## Interface language (per device) and speech language (per profile)

| Control | Stored | Observable effect | Test |
|---|---|---|---|
| Interface language: Oʻzbekcha (lotin) / Ўзбекча (кирилл) / Русский | device `uiLang` (+ `uzScript`) | `html[lang]`, every screen, aria-label, page title, cards, games, stories, feelings in that language/script; **speech language of every profile that follows it switches at the same moment** (in memory and in IndexedDB), so clips come from `audio/<lang>/` at once. No question is asked. | `language: switching…`; `src/store/speechFollow.test.ts`; `node e2e/i18n-audit.mjs` |
| 2026 Latin alphabet (experimental, only with Oʻzbekcha) | device `uzScript = latn2026` | Ş Ç Ö Ğ everywhere, no mixed forms | `i18n-audit` (lang `uz2026`) |
| «Ovoz tili alohida / Язык озвучки отдельно» (advanced override, off by default) | profile `speechLangFollowsUi` | off: speech language = UI language (invariant enforced in `profile.update`, `switchTo`, `load`, `create`, and on every UI-language change). on: the speech-language control appears and a note explains the difference | `language: the separate speech language…` |
| Speech language (only with the override on) | profile `speechLang` | labels on cards/games/stories/feelings and the voice clips are in that language while the UI keeps its own | same test |

Migration: a profile stored before the flag existed follows only when its speech language already matched the UI language,
otherwise it keeps its language as an override (`applyUiLangToProfile`).

## Look

| Control | Stored | Observable effect | Test |
|---|---|---|---|
| Theme ×6 | profile `theme` | `html[data-theme]`, computed body colours, `<meta name=theme-color>` | `theme: …` (also per profile, reload) |
| Sensory level calm / normal / festive | profile `sensory` | `html[data-sensory]`; calm: no running CSS animations (`document.getAnimations()`), springs shortened, **no sound effects** (except the gentle `soft`), no particles; festive: particles on rewards. `prefers-reduced-motion` forces calm (the saved choice is untouched; the hint under the control says so). Teacher rail «Tinch rejim» overrides for the board session only | `sensory: …`, `sensory: the OS reduced-motion…`, `board: the teacher rail` |
| Text size 100–200 % | profile `textScale` | root `font-size` × scale, `html[data-tscale=big]` from 150 %, layout reflows; was **not reachable in the UI before** (the control existed but was not mounted) | `text size: …` |

## Touch (read by `<Pressable>`, i.e. every button; inside the adult area the accommodations are off by design)

| Control | Stored | Observable effect | Test |
|---|---|---|---|
| Activate on release | profile `touch.activateOnRelease` | on: pointer down alone does nothing, release inside acts; off: pointer down acts at once and the following click is swallowed | `touch: activate-on-release` |
| Hold time (0–1.5 s) | `touch.holdMs` | a tap shorter than the hold does nothing; a press ≥ hold acts; progress ring while holding | `touch: hold time` |
| Ignore repeated presses | `touch.ignoreRepeatMs` | a second activation of the same target inside the window is ignored; other targets never; also applies to the scanning switches | `touch: ignore repeated presses`, `scanning: step mode` |
| Dwell (hover to activate) | `touch.dwellMs` | mouse/pen resting on a target for that long activates it; 0 = off | `touch: dwell` |

Deliberate safety overrides (documented, not bugs): the syllables drum caps the repeat guard at 180 ms (rhythm), the day-plan «Done» button uses at least 800 ms, the token board keeps at least 600 ms / a 1 s hold for children, the adult area uses no accommodations (`ADULT_TOUCH`).

## Switch scanning

| Control | Stored | Observable effect | Test |
|---|---|---|---|
| Mode off / auto 1 switch / step 2 switches | profile `scanning.mode` | `.is-scan-target` highlight; auto: moves by itself, Space/Enter selects; step: Space moves, Enter selects, nothing moves alone. The scan restarts from the first item on every route change (was: kept a stale position from the previous screen — fixed) | `scanning: auto…`, `scanning: step…` |
| Interval 0.5–5 s (auto only) | `scanning.intervalMs` | highlight speed | `scanning: auto…` |
| Say every item aloud | `scanning.audioCue` | `speechSynthesis.speak` called with the highlighted item's name; silent when off | `scanning: the audio cue…` |

## Voice

| Control | Stored | Observable effect | Test |
|---|---|---|---|
| Speed 0.6–1.4× | profile `voice.rate` | `HTMLAudioElement.playbackRate` of the clip; `SpeechSynthesisUtterance.rate` for a device voice. UI shows `×1,4` with a decimal comma | `voice: speed and volume…` |
| Prefer the device voice | `voice.preferSystem` | with a device voice for the language the word goes to `speechSynthesis` instead of the bundled clip | `voice: "prefer the device voice"`; `src/audio/speech.test.ts` |
| Voice volume | `voice.volume` | `audio.volume` | `voice: speed and volume…` |
| Effects volume | `voice.sfxVolume` | 0: no oscillator is created; > 0: effects sound (not in calm) | `voice: effects volume` |
| «Ovozni sinash» | – | speaks a sample with the current rate/volume | `voice: "Ovozni sinash"` |
| `voice.musicVolume` | profile | **reserved, no UI and no music in the app**; kept in the data model and backups only | – |

## Communicator (AAC)

| Control | Stored | Observable effect | Test |
|---|---|---|---|
| Core word level 1/2/3 (adult area → Cards) | profile `aac.level` | 9 / 18 / 36 core cells on `/talk`, words never move | `AAC level` |
| Card labels off / top / bottom | `aac.showLabels`, `aac.labelPos` | `data-label` and label position in every cell and in the message bar chips; accessible name stays | `AAC labels…` |
| Colour coding | `aac.colorCoding` | cell background/border per part of speech; off: one colour | `AAC labels…` |
| Hide a word / show all (Cards) | `aac.hiddenWordIds` | the word disappears from core and topic boards, the others do not move | `AAC hidden words` |

## Adult lock

| Control | Stored | Observable effect | Test |
|---|---|---|---|
| PIN (4–6 digits) | device `parentPinHash` | after the 1.5 s hold the gate asks for the PIN; wrong PIN refused; clearable | `PIN: …` |
| Reset to defaults | – | theme, sensory, text size, touch, scanning, voice, AAC display options and the speech override return to the defaults of the profile kind; name, cards, hidden words, recordings stay | `reset to defaults…` |

## Board (whiteboard) mode: **one source of truth = device `boardMode` + `boardCalibration`**

The switch in Settings, the switch on `/board-setup` and the teacher rail's «Chiqish» all read and write the same store
fields. Switching on without a calibration derives one from the viewport (`defaultCalibration`).

| Field | Effect (live while board mode is on, stored at once) | Test |
|---|---|---|
| On/off | `html[data-board]`, `--ui-scale`, `--reach`, bottom bar + teacher rail; off removes the variables and restores the normal layout | `board: the Settings switch…` |
| Screen diagonal 55/65/75/86″, bottom edge (cm), children's age | `--reach` (share of the screen height the children reach), clamped to 15–80 % with a visible warning when the geometry says otherwise | `board: every setup field…` |
| Distance | changes the suggested scale | same |
| Scale + «Tavsiyani qoʻllash» | `--ui-scale` and the root font-size; clamped so the usable area stays ≥ ~1000×700 px, with a visible warning (never silent) | same |
| «Doska rejimida koʻrish» (preview, board mode off) | shows the layout with the draft values over the real app; nothing is stored until «Saqlash» (a reload during the preview returns to the stored state); «Sozlashga qaytish» restores the previous state | `board: "preview in board mode"…` |
| Teacher rail: fullscreen, quiet mode (this session only), exit | see rail; quiet mode never overwrites the saved sensory level | `board: the teacher rail…` |
| Layout at 1366×768, 1920×1080, 3840×2160 | no horizontal overflow, bottom bar inside the screen, rail inside, reach zone sits right above the bar | `board layout at …` (screenshots in `e2e/.shots/`) |

## Profile switch

Adult area → Profiles → «<name> — tanlash» activates another profile: theme, sensory, text size, touch, scanning, voice and AAC settings are all taken from that profile (asserted in the theme, sensory, text size, AAC level and language tests). Device-level settings (language script, PIN, board mode) stay.

## In-memory mode (IndexedDB unavailable)

Settings still apply immediately (the profile lives in memory), the adult area shows «Brauzer maʼlumotni saqlashga ruxsat bermayapti…». Proven by `in-memory mode`.
