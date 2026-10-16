# План реализации Gapimiz MVP v0.1

> **Для агентов-исполнителей.** Обязательный навык: superpowers:subagent-driven-development, исполнение через Workflow (параллельные агенты, затем ревьюеры). Шаги отмечаются чекбоксами `- [ ]`.

**Цель.** Рабочее PWA Gapimiz на GitHub Pages: AAC-коммуникатор (uz-Latn, uz-Cyrl, ru) + 4 игры + 3–4 упражнения + расписание + зона родителя + режим доски + взрослый режим. Работает офлайн, адаптивно от 360 px до 4K-доски.

**Архитектура.** Статическое React-SPA с hash-роутингом и service worker (Workbox). Данные хранятся только на устройстве: Dexie/IndexedDB и Zustand (localStorage). Контент (словарь, тексты) лежит в типизированных TS-модулях. Аудио заранее генерируется в MP3 (Silero, MIT), символы конвертируются в WebP (Fluent Emoji, MIT). Тяжёлые сенсоры (MediaPipe) подгружаются лениво.

**Стек.** Vite, React 19, TypeScript (strict), vite-plugin-pwa, react-router (hash), zustand, dexie, motion, lucide-react, @fontsource-variable/nunito и onest, @mediapipe/tasks-vision (лениво), vitest + @testing-library/react + jsdom, @playwright/test.

**Спецификация:** `docs/superpowers/specs/2026-10-16-aac-speech-app-design.md`. Читать вместе с этим планом.

## Глобальные ограничения

- **Версии.** Каждая зависимость закрепляется на последней версии, опубликованной **не позже 02.10.2026** (не моложе 14 дней). Проверка: `npm view <pkg> time --json`.
- **Узбекский текст:**
  - канон — латиница 1995 года;
  - oʻ и gʻ пишутся через **U+02BB** (ʻ), тутук белгиси — через **U+02BC** (ʼ);
  - ASCII-апостроф в узбекских строках контента запрещён (это проверяет тест).
- **Шрифты:** Nunito (UI, детская тема) и Onest (взрослая тема), подмножества latin, latin-ext, cyrillic, cyrillic-ext. Другие шрифты не используются.
- **Минимальные цели касания:** 48 CSS px для любой цели; AAC-ячейка у детей по умолчанию ≥ 72 px.
- **Горизонтального скролла нет** на 360, 390, 768, 820, 1024, 1366, 1920 и 3840 px.
- **Анимации** только через `transform` и `opacity`. На уровне `calm` и при `prefers-reduced-motion` остаётся только fade ≤ 200 мс.
- **Без сети:**
  - нет внешних запросов, кроме CDN MediaPipe в «Зеркальце»;
  - нет аналитики, рекламы и трекеров;
  - камера и микрофон работают без записи на сервер (запись идёт только по явному действию взрослого и только в IndexedDB).
- **Нет текста «ошибка» или «неправильно» для ребёнка.** В детских экранах нет красного цвета как сигнала неудачи.
- **Сборка:**
  - `base: './'`, роутер — `HashRouter`;
  - все пути к ассетам относительные, через `import.meta.env.BASE_URL` или относительные URL.
- **Имя приложения** задаётся в одном месте: `src/app/brand.ts` (`APP_NAME = 'Gapimiz'`, `MASCOT = { uz: 'Musicha', ru: 'Муся' }`).
- **Язык кода и комментариев** английский, весь пользовательский текст — через i18n или контент (uz/ru).

## Фокус ревью (что тесты задач могут не поймать)

1. **Нет узбекского системного голоса** (Android Chrome, iOS). Ожидание: клип из `/audio/uz/` проигрывается. Если клипа нет, крупный текст + «запишите свой голос», без исключений в консоли. Тест в задаче A8: `resolveSource` с `systemVoice=null, hasClip=false` возвращает `'none'`, а `speak` возвращает `{source:'none'}`.
2. **Двойное или дрожащее нажатие** при ДЦП: два касания за 200 мс. Ожидание: одна активация при `ignoreRepeatMs=300`. Тест в задаче A5 (Pressable).
3. **Отказ в микрофоне или камере, либо их отсутствие** (доска без камеры, iOS). Ожидание: игры работают через «удерживай кнопку», показан понятный экран восстановления. Тест в задачах B5 и B6: мок `getUserMedia` бросает `NotAllowedError`, на экране видна кнопка-заменитель.
4. **Кириллица и смешанный ввод** («oʻ», «o'», «o‘», «o`»). Ожидание: всё нормализуется к ʻ, транслитерация в кириллицу даёт «ў». Тест в задаче A3.
5. **Переполнение хранилища или приватный режим** (IndexedDB недоступна). Ожидание: приложение открывается и работает со стандартным словарём, сохранение своих карточек показывает понятное сообщение. Тест в задаче A4: при сбое `db.open` профиль по умолчанию остаётся в памяти.

---

## Карта файлов

```
index.html, package.json, tsconfig.json, vite.config.ts, playwright.config.ts
.github/workflows/deploy.yml
public/  favicon.svg, icons/(icon-192.png, icon-512.png, maskable-512.png), symbols/*.webp, audio/{uz,ru}/*.mp3
scripts/ fetch-symbols.mjs, symbol-map.json, build-audio-manifest.ts, gen_audio.py, README.md
src/
  main.tsx
  app/      brand.ts, App.tsx, routes.tsx, AppShell.tsx, NavBar.tsx, HomeChild.tsx, HomeAdult.tsx, NotFound.tsx
  design/   tokens.css, global.css, motion.ts, useTheme.ts
  i18n/     types.ts, orthography.ts(+test), strings.uz.ts, strings.ru.ts, index.tsx(+test)
  content/  types.ts, vocab.ts, topics.ts, phrases.ts, animals.ts, syllables.ts, exercises.ts, tips.ts, stickers.ts, audio-index.json, content.test.ts
  audio/    speech.ts(+test), player.ts, sfx.ts, recorder.ts, voices.ts
  sensors/  mic.ts, micDsp.ts(+test), camera.ts, face.ts
  store/    db.ts, device.ts, profile.ts(+test), events.ts
  ui/       Pressable.tsx(+test), Button.tsx, Tile.tsx, Card.tsx, Dialog.tsx, Toggle.tsx, Slider.tsx, Segmented.tsx,
            SymbolImg.tsx, PageHeader.tsx, ParentGate.tsx, EmptyState.tsx, Reward.tsx, FullscreenButton.tsx,
            scan/ScanProvider.tsx(+test), mascot/Musicha.tsx, mascot/Ogizcha.tsx, ornament/*.tsx
  features/ onboarding/, aac/, games/{GameShell.tsx, animals/, find/, memory/, syllables/, emotions/},
            exercises/{mirror/, blow/, voice/, sounds/}, schedule/, parent/, board/
  lib/      useMediaQuery.ts, useReducedMotion.ts, random.ts, download.ts, time.ts
e2e/        smoke.spec.ts, responsive.spec.ts
docs/       research/, superpowers/specs, superpowers/plans, LICENSES-ASSETS.md
```

## Общие контракты (их используют все задачи)

```ts
// src/i18n/types.ts
export type UiLang = 'uz' | 'uzc' | 'ru'          // uz = Latin 1995, uzc = Cyrillic
export type SpeechLang = 'uz' | 'ru'
export type UzScript = 'latn' | 'cyrl' | 'latn2026'
export interface Bi { uz: string; ru: string }     // bilingual text, uz in canonical Latin

// src/content/types.ts
export type Fitz = 'people' | 'action' | 'describe' | 'thing' | 'social' | 'question' | 'negation' | 'misc'
export type TopicId = 'core' | 'food' | 'drinks' | 'people' | 'feelings' | 'body' | 'toys' | 'places'
  | 'clothes' | 'actions' | 'animals' | 'school' | 'time'
export interface Word extends Bi {
  id: string                 // stable ascii id, e.g. 'water'
  fitz: Fitz
  symbol: string             // symbol id -> public/symbols/<symbol>.webp
  topic: TopicId
  ruTts?: string             // Russian with '+' before stressed vowel (build-time TTS only)
  uzTts?: string             // optional uz override for TTS
  core?: { row: number; col: number; level: 1 | 2 | 3 }   // only for topic 'core', 6x6 grid, 0-based
  syllables?: Bi             // e.g. { uz: 'ol-ma', ru: 'яб-ло-ко' }
}
export interface Topic extends Bi { id: TopicId; symbol: string; fitz: Fitz }
export interface Phrase extends Bi { id: string; symbol: string; ruTts?: string; audience: 'kid' | 'adult' | 'both' }
export type AudioKey = string     // 'w.<id>' | 'p.<id>' | 'g.<game>.<id>' | 'ui.<id>' | 'x.<exercise>.<id>'

// src/store/profile.ts
export type ThemeId = 'bolajon' | 'tun' | 'tinch' | 'kattalar' | 'hc-light' | 'hc-dark'
export type Sensory = 'calm' | 'normal' | 'festive'
export interface Profile {
  id: string; name: string; avatar: string; kind: 'child' | 'adult'
  ageGroup: '2-4' | '5-7' | '8-12' | '13+'
  speechLang: SpeechLang; theme: ThemeId; sensory: Sensory
  aac: { level: 1 | 2 | 3; showLabels: boolean; labelPos: 'top' | 'bottom'; colorCoding: boolean; hiddenWordIds: string[] }
  touch: { activateOnRelease: boolean; holdMs: number; ignoreRepeatMs: number; dwellMs: number }
  scanning: { mode: 'off' | 'auto1' | 'step2'; intervalMs: number; audioCue: boolean }
  voice: { rate: number; preferSystem: boolean; volume: number; sfxVolume: number; musicVolume: number }
  createdAt: number
}
export function defaultProfile(partial?: Partial<Profile>): Profile

// src/audio/speech.ts
export type SpeakSource = 'recording' | 'clip' | 'system' | 'none'
export interface SpeakItem { key: AudioKey; text: Bi; recordingId?: string }
export function resolveSource(p: { hasRecording: boolean; hasClip: boolean; hasSystemVoice: boolean; preferSystem: boolean }): SpeakSource
export function speak(item: SpeakItem, lang?: SpeechLang): Promise<{ source: SpeakSource }>
export function speakSequence(items: SpeakItem[], lang?: SpeechLang): Promise<void>
export function stopSpeaking(): void
export function onSpeechLevel(cb: (level: number) => void): () => void   // 0..1 for mascot beak

// src/ui/Pressable.tsx
export interface PressableProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
  onActivate: () => void; label: string; disabled?: boolean; as?: 'button' | 'div'
  scanGroup?: string                 // row id for row-column scanning
}
// src/ui/mascot/Musicha.tsx
export type MascotState = 'idle' | 'listen' | 'speak' | 'happy' | 'calm' | 'think'
export function Musicha(p: { state?: MascotState; size?: number; className?: string }): JSX.Element
// src/store/events.ts
export type EventType = 'aac_word' | 'aac_phrase' | 'aac_speak' | 'game_round' | 'exercise' | 'session_start'
export function logEvent(type: EventType, ref: string, meta?: Record<string, unknown>): void
```

---

## Фаза A — Фундамент (исполняю сам, последовательно)

### Task A1: каркас проекта
**Files:** `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/brand.ts`, `src/vite-env.d.ts`, `.gitattributes`.
- [ ] Выбрать версии по правилу «≥14 дней» и вписать их в `package.json` точными номерами.
- [ ] Скрипты: `dev`, `build` (`tsc -b && vite build`), `preview`, `typecheck` (`tsc -b --noEmit` или `tsc -p . --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`), `audio:manifest`, `symbols`.
- [ ] Настроить `vite.config.ts`: `base: './'`; плагин react; VitePWA (манифест из спеки §8: name и short_name — Gapimiz, `start_url: './'`, `scope: './'`, `display: 'standalone'`, `background_color: #FBF7F0`, `theme_color: #0A7584`); workbox с `globPatterns` для js, css, html, svg, webp, png, woff2, mp3, json и `maximumFileSizeToCacheInBytes: 6MB`; runtimeCaching CacheFirst для `cdn.jsdelivr.net/npm/@mediapipe` и `storage.googleapis.com/mediapipe-models`; `test: { environment: 'jsdom', setupFiles: ['src/test-setup.ts'] }`.
- [ ] Проверить: `npm run build` проходит, `npm test` (пустой прогон) проходит.
- [ ] Коммит `chore: scaffold Vite + React + TS + PWA project`.

### Task A2: дизайн-токены и темы
**Files:** `src/design/tokens.css`, `src/design/global.css`, `src/design/motion.ts`, `src/design/useTheme.ts`.
- [ ] CSS-переменные для 6 тем через `html[data-theme=…]`, значения из спеки §6:
  - `--bg --surface --surface-2 --text --text-muted --primary --on-primary --primary-container --on-primary-container --secondary --accent --success --warm --outline --focus-outer --focus-inner --shadow-color`;
  - категории `--fitz-<cat>-bg` и `--fitz-<cat>-border`;
  - радиусы `--r-cell 20px --r-card 28px --r-sheet 32px --r-tile 48px` (во взрослой теме 12/16);
  - тени `--elev-1..3`;
  - шрифты `--font-ui 'Nunito Variable'` и `--font-adult 'Onest Variable'`.
- [ ] Режим доски `html[data-board='true']`: `--ui-scale` и `--reach` (доля высоты экрана для зоны досягаемости, по умолчанию 0.45).
- [ ] Глобальные стили:
  - reset; `body` со шрифтом и фоном;
  - `:focus-visible` двойное кольцо 3 px + 2 px;
  - `@media (prefers-reduced-motion)`;
  - `forced-colors`: рамки поверхностям;
  - `user-select: none` на игровых зонах.
- [ ] `motion.ts`: `springs(sensory)` возвращает `{ press, screen, dialog }` (M3: 0.6/800, 0.8/380; standard 0.9/700; calm — tween 0.15 с) и `useMotionPreset()`.
- [ ] Коммит.

### Task A3: i18n и орфография (TDD)
**Files:** `src/i18n/orthography.ts`, `src/i18n/orthography.test.ts`, `src/i18n/strings.uz.ts`, `src/i18n/strings.ru.ts`, `src/i18n/index.tsx`, `src/i18n/index.test.tsx`.
- [ ] Сначала тесты:
  - `normalizeUz("o'g'il")` → `"oʻgʻil"`, а также для `‘ ’ \``;
  - `normalizeUz("ma'no")` → `"maʼno"` (после гласной, не o/g, — тутук U+02BC);
  - `uzLatnToCyrl('Oʻzbekiston')` → `'Ўзбекистон'`; `('shaftoli')` → `'шафтоли'`; `('choy')` → `'чой'`; `('gʻisht')` → `'ғишт'`; `('qovun')` → `'қовун'`; `('hayvon')` → `'ҳайвон'`; `('yoʻq')` → `'йўқ'`; `('ekran')` → `'экран'` (э в начале слова); `('telefon')` → `'телефон'`; `('yaxshi')` → `'яхши'`; `('yulduz')` → `'юлдуз'`; `('Yosh')` → `'Ёш'`; `('mashina')` → `'машина'`; `('maʼno')` → `'маъно'`; `('Toshkent')` → `'Тошкент'`; `('sentabr')` → `'сентябр'` (словарь исключений, явный список); `('ts')` внутри русских заимствований (`'sirk'` → `'цирк'` только через исключения; по умолчанию `s` → `с`).
  - `uzLatnToLatn2026('shaftoli oʻgʻil choy')` → `'şaftoli öğil çoy'`; заглавные `'Sh'` → `'Ş'`.
  - Регистр сохраняется (`'OLMA'` → `'ОЛМА'`).
- [ ] Реализация: посимвольный конвертер с приоритетом диграфов (`sh ch oʻ gʻ yo yu ya ye`), правилом `e`→`э` в начале слова и после гласной, картой исключений и сохранением регистра.
- [ ] `strings.*.ts`: ключи UI из всех экранов спеки; `uz` — канон, `uzc` получается через `uzLatnToCyrl` на лету.
- [ ] `useI18n()` возвращает `{ lang, t(key, vars?), bi(text: Bi): string, script }`, а также `I18nProvider`.
- [ ] Тест полноты: множества ключей `uz` и `ru` совпадают, в них нет пустых строк и ASCII-апострофа в `uz`.
- [ ] Коммит.

### Task A4: хранилище
**Files:** `src/store/db.ts`, `src/store/device.ts`, `src/store/profile.ts`, `src/store/profile.test.ts`, `src/store/events.ts`.
- [ ] Dexie-база `gapimiz`, v1. Таблицы:
  - `profiles: 'id'`;
  - `cards: 'id, profileId'`;
  - `recordings: 'id, profileId'` (поле blob);
  - `events: '++id, profileId, type, ts'`;
  - `schedules: 'id, profileId'`;
  - `stickers: '++id, profileId, ts'`.
- [ ] `device.ts` (zustand persist, ключ `gapimiz.device`): `{ uiLang, onboarded, activeProfileId, boardMode, boardCalibration, parentPinHash }` и экшены.
- [ ] `profile.ts`:
  - `defaultProfile()` по спеке: child, level 2, `holdMs 0`, `ignoreRepeatMs 300`, `dwellMs 0`, `activateOnRelease true`, theme `bolajon`, sensory `normal`, rate 1, volume 1;
  - хук `useProfile()`, `updateProfile(patch)`, `createProfile()`;
  - **если IndexedDB недоступна**, профиль живёт в памяти (тест из Фокуса ревью №5).
- [ ] `events.ts`: `logEvent` (без await, ошибки глушим), `queryEvents(profileId, sinceTs)`.
- [ ] Коммит.

### Task A5: UI-кит, Pressable, сканирование, маскот
**Files:** `src/ui/*`, `src/ui/scan/*`, `src/ui/mascot/*`.
- [ ] **Тесты Pressable** (fake timers, pointer events):
  - (a) `activateOnRelease` — активация на pointerup внутри элемента, а не на pointerdown;
  - (b) `holdMs=500` — отпустили через 300 мс, активации нет; через 600 мс — есть;
  - (c) `ignoreRepeatMs=300` — два быстрых тапа дают 1 активацию;
  - (d) Enter/Space с клавиатуры активируют;
  - (e) `dwellMs=800` при наведении мыши даёт активацию через 800 мс и прогресс-кольцо;
  - (f) ушли с элемента до отпускания — активации нет.
- [ ] **Тесты ScanProvider:**
  - `auto1` — подсветка двигается каждые `intervalMs`, Space выбирает подсвеченный;
  - группы: сначала строки, затем ячейки внутри выбранной строки;
  - `step2` — Space переходит к следующему, Enter выбирает.
- [ ] Компоненты: `Button` (варианты primary, secondary, ghost, danger-free, на базе Pressable), `Tile` (большая плитка с символом и подписью), `Card`, `Dialog` (fade/sheet, фокус-ловушка, Esc), `Toggle`, `Slider`, `Segmented`, `SymbolImg` (WebP из `symbols/` с fallback-эмодзи; `alt=''`, если рядом есть подпись), `PageHeader` (назад, заголовок, действия), `ParentGate` (удержание 3 с с кольцом прогресса и PIN при наличии), `EmptyState`, `Reward` (наклейка с лёгким конфетти на CSS/Motion в пределах 1/3 экрана, а при `calm` — статичный значок), `FullscreenButton`.
- [ ] `Musicha.tsx`: SVG-горлица (тело, голова, глаз с бликом, клюв из двух половин, крыло, хвост, щёчки).
  - Состояния: `idle` (моргание раз в 3–5 с, лёгкое «дыхание» scale 1→1.02), `listen` (наклон головы 8°), `speak` (клюв открывается по `onSpeechLevel`), `happy` (прыжок, взмах крыльями), `calm` (глаза закрыты), `think`.
  - При `calm` или reduced motion idle-анимаций нет.
- [ ] `Ogizcha.tsx`: лицо-модель (овал, глаза, брови, губы, зубы, язык) с позами упражнений `smile | tube | open | cheeks | fence | clock-left | clock-right | spatula | needle | horse | jam | neutral`.
- [ ] Коммит.

### Task A6: контент (параллельно — агент «контент», см. Workflow W1)
**Files:** `src/content/*.ts`, `src/content/content.test.ts`.
- [ ] **Ядро — 36 слов** в сетке 6×6 с уровнями: уровень 1 — 9 слов, уровень 2 — +9, уровень 3 — +18. Слова: men, sen, u, bu, xohlayman, yana, yoʻq, ha, ber, yordam, toʻxta, bor (ketdik), kel, qil, qara, och, yop, yaxshi, yomon, katta, kichik, nima?, qayerda?, kim?, tamom, yoqadi, yoqmaydi, oʻyna, ye, ich, uxla, tepaga, pastga, boshqa, shu yerda, hozir. Русские эквиваленты: я, ты, он/она, это, хочу, ещё, нет, да, дай, помоги, стоп, пойдём, иди сюда, делать, смотри, открой, закрой, хорошо, плохо, большой, маленький, что?, где?, кто?, всё, нравится, не нравится, играть, есть, пить, спать, вверх, вниз, другое, здесь, сейчас.
- [ ] **Темы — 12 по 14–24 слова.** Узбекские реалии: non, osh/palov, somsa, choy, qovun, tarvuz, uzum, anor, shaftoli, sut, suv, sharbat, tuxum, goʻsht, guruch, sabzi, kartoshka, olma, banan, shirinlik; семья: ona, ota, buvi, bobo, aka, opa, uka, singil, tarbiyachi, shifokor, doʻst; тело и боль: bosh, qorin, tish, quloq, oyoq, qoʻl, «ogʻriyapti».
- [ ] **Фразы:** детские (≥20) и взрослые (≥25, включая шкалу боли 0–10 и «Позовите медсестру/врача»), у каждой `ruTts` с ударениями.
- [ ] **Остальной контент:**
  - животные и машины со звукоподражаниями uz/ru (≥18);
  - слоги (≥24 слова с `syllables`);
  - 10 упражнений (название, шаги, поза Ogizcha, blendshape-метрика или `null`, длительность удержания);
  - 10 советов;
  - 24 наклейки.
- [ ] **Тест целостности:**
  - id уникальны;
  - позиции ядра уникальны, 0 ≤ row, col < 6, каждый уровень отвечает своему числу слов;
  - у каждого Word заданы uz, ru, symbol и fitz;
  - в `uz` нет ASCII-апострофа;
  - у каждого символа есть файл `public/symbols/<symbol>.webp` (тест пропускается, пока символы не скачаны).
- [ ] Коммит.

### Task A7: конвейеры ассетов
**Files:** `scripts/symbol-map.json`, `scripts/fetch-symbols.mjs`, `scripts/build-audio-manifest.ts`, `scripts/gen_audio.py`, `scripts/README.md`, `src/content/audio-index.json`.
- [ ] **Символы:**
  - `symbol-map.json`: `symbolId` → путь к ассету Fluent 3D (по разреженному клону `microsoft/fluentui-emoji`);
  - `fetch-symbols.mjs` копирует PNG, `sharp` конвертирует в WebP 192×192, q≈82;
  - свои SVG (anor, non, doʻppi, somsa) копируются как есть.
- [ ] **Аудио:**
  - `build-audio-manifest.ts` (tsx) собирает все озвучиваемые тексты: слова, фразы, подсказки игр и UI-реплики — в `scripts/.cache/audio-manifest.json` вида `[{key, lang, text}]`;
  - `gen_audio.py` делает Silero (`uzb_saida` и выбранный `ru_*`, 48 кГц), затем ffmpeg (mp3, mono, 40 кбит/с, `loudnorm` I=-16), пишет в `public/audio/<lang>/<key>.mp3` и обновляет `src/content/audio-index.json` (`{ uz: string[], ru: string[] }`).
- [ ] Коммит ассетов (ожидается ≈10 МБ).

### Task A8: аудиосервисы
**Files:** `src/audio/speech.ts`, `src/audio/speech.test.ts`, `src/audio/player.ts`, `src/audio/sfx.ts`, `src/audio/recorder.ts`, `src/audio/voices.ts`.
- [ ] **Тесты `resolveSource`:**
  - запись есть — `recording`;
  - есть клип и `preferSystem=false` — `clip`;
  - есть клип, `preferSystem=true` и голос есть — `system`;
  - нет клипа, есть голос — `system`;
  - нет ничего — `none`.
- [ ] **Тесты `pickVoice(voices, lang)`:** выбирается точное совпадение `uz-UZ`/`ru-RU`, затем префикс `uz`/`ru`; голос `tr` или `kk` для `uz` **никогда не выбирается**.
- [ ] **`player.ts`:** один общий `AudioContext` (создаётся по первому жесту), `HTMLAudioElement` → `MediaElementSource` → Analyser; `play(url)` возвращает Promise, событие уровня для маскота, громкость голоса.
- [ ] **`sfx.ts`:** синтезированные короткие звуки (pop, chime, whoosh, tick) через осциллятор без файлов, с громкостью эффектов и `calm` = выкл.
- [ ] **`recorder.ts`:** `MediaRecorder` до 10 с, выбор mime (`audio/webm;codecs=opus`, на iOS `audio/mp4`), сохранение в `recordings`.
- [ ] Коммит.

### Task A9: оболочка, онбординг, режим доски
**Files:** `src/app/*`, `src/features/onboarding/*`, `src/features/board/*`.
- [ ] **Роуты (hash):**
  - `/`, `/onboarding`, `/talk`;
  - `/games` и `/games/:id`, `/exercises` и `/exercises/:id`;
  - `/day`, `/parent/*`, `/board-setup`.
- [ ] **Навигация по классам устройств:**
  - ребёнок на телефоне — нижний бар из 4 пунктов: Gapirish, Oʻyinlar, Mashqlar, Kun tartibi;
  - планшет и ПК — рельс слева;
  - родительский вход — иконка-замок → ParentGate.
- [ ] **HomeChild:**
  - Musicha здоровается;
  - 4 огромные плитки и «Наклейки»;
  - строка «Gapim bor!» ведёт в коммуникатор.
- [ ] **HomeAdult:** коммуникатор, клавиатура, фразы, упражнения, без маскота.
- [ ] **Onboarding:** язык → кто пользуется (ребёнок или взрослый) → язык озвучки → 3 карточки для взрослого → готово. Можно пропустить.
- [ ] **Режим доски:**
  - `useBoardMode()`;
  - подсказка-баннер для coarse-указателя без hover при ширине ≥1200;
  - `BoardSetup` — калибровка (высота кромки 0,5–1,0 м, возраст), расчёт `--reach`;
  - `BoardStage` (верх показывает, низ интерактивный);
  - `TeacherPanel` в правом верхнем углу (замок, громкость, спокойно, выход);
  - полноэкранный режим.
- [ ] Применение темы и сенсорного уровня к `<html>`; `navigator.storage.persist()` после онбординга.
- [ ] Коммит. Приложение открывается, все роуты рендерят заглушки фич.

## Фаза B — Фичи (Workflow W2, параллельные агенты, каждый в своей папке)

Общие правила для агентов:
- использовать только контракты выше и компоненты `src/ui`;
- все тексты брать через i18n или контент, при необходимости добавлять ключи в `strings.uz.ts` и `strings.ru.ts` в свой namespace-префикс;
- звук — только через `speak`, `speakSequence` и `sfx`;
- нажатия — только через `Pressable`, `Button` или `Tile` (отсюда сканирование и защита от случайных нажатий);
- `logEvent` на ключевых действиях;
- поддержка режима доски через `BoardStage`;
- юнит-тесты для чистой логики;
- `npm run typecheck && npm test` должны быть зелёными.

### Task B1: коммуникатор `features/aac/`
- [ ] `AacScreen`: строка сообщения, вкладки тем (иконки), область сетки, Да/Нет, кнопки «Быстрые фразы», «Клавиатура» (только взрослый режим или настройка), «Показать» (моделирование).
- [ ] `CoreGrid`:
  - 6×6 по `core.row/col`;
  - уровень профиля скрывает слова с `level >` уровня (пустая ячейка-заглушка той же формы);
  - `hiddenWordIds` скрывает конкретные слова;
  - цвет по `fitz`.
- [ ] `TopicGrid`: авто-колонки по ширине контейнера (container queries), стабильный порядок, свои карточки профиля в конце темы.
- [ ] `MessageBar`:
  - добавление (анимация «перелёта» к строке, а при `calm` без неё);
  - ⌫ и ✕;
  - нажатие на строку → `speakSequence`;
  - лимит 20 элементов.
- [ ] `Keyboard`: раскладки uz-Latn (с ʻ ʼ), uz-Cyrl, ru; подсказки (префикс по словарю и истории из events); «Произнести» (system TTS или, для uz без голоса, крупный текст).
- [ ] **Тесты:** reducer сообщения (add, backspace, clear, limit); маскирование уровней (на уровне 1 видно ровно 9 слов, позиции совпадают с уровнем 3); функция подсказок.

### Task B2: редактор карточек `features/parent/cards/`
- [ ] Список тем и карточек.
- [ ] «Добавить карточку»: подписи uz и ru (поле uz нормализуется), фото (`<input type=file accept=image/* capture=environment>` и уменьшение до 512 px в canvas), запись голоса (`recorder`), тема, категория.
- [ ] Скрыть или показать слова ядра и тем; «Сбросить».
- [ ] **Тест:** уменьшение изображения (чистая функция расчёта размеров); сериализация карточки.

### Task B3: игры «Kim nima deydi?» и «Topchi!» `features/games/{animals,find}/`
- [ ] **`GameShell`** (общий): шапка, уровень, `Reward` после раунда, кнопка взрослого «Получилось!», мягкий конец через 3 раунда («Дам отдохнуть»), `logEvent('game_round')`.
- [ ] **«Кто как говорит»:**
  - сцена «двор» с 6–12 животными (`SymbolImg` с покачиванием);
  - режим «Исследуй»;
  - режим «Найди, кто говорит X»: 2/3/4 варианта по уровню, безошибочная подсказка через 4 с.
- [ ] **«Найди!»:**
  - выбор темы;
  - 2→6 карточек;
  - голос «Olmani top!»;
  - правильная карточка — Reward и следующий раунд; неверная мягко покачивается без звука ошибки;
  - режим «Скажи сам» — кнопка взрослого.
- [ ] **Тесты:** генератор раундов (нет повторов подряд, правильный ответ в наборе, число вариантов по уровню).

### Task B4: игры «Juftini top» и «Chapak-chapak» `features/games/{memory,syllables}/`
- [ ] **«Найди пару»:**
  - 2×2 / 3×2 / 4×3 / 4×4;
  - переворот (rotateY через Motion, а при `calm` fade);
  - озвучка карточки;
  - в режиме доски 2 поля и 2 игрока одновременно (раздельные `pointerId`).
- [ ] **«Хлоп-хлоп»:**
  - слово с картинкой, слоги показаны «бусинами»;
  - ребёнок нажимает барабан по слогу, бусина загорается, Musicha прыгает;
  - после последнего слога слово звучит целиком.
- [ ] **Тесты:** логика пар (совпадение, блокировка во время анимации, победа); разбиение слогов из `syllables`.

### Task B5: упражнения «Puf-puf!» и «Uch, Musicha!» `features/exercises/{blow,voice}/` и `src/sensors/mic*.ts`
- [ ] `micDsp.ts` (чистые функции, **тесты** на синтетических сигналах):
  - `rms(frame)`;
  - `lowBandRatio(spectrum, sampleRate, cutoffHz=500)`;
  - `spectralFlatness(spectrum)`;
  - `createBlowDetector({noiseFloor, minMs})` — шум (широкополосный, низкие частоты) длительностью ≥ minMs детектится, а синусоида 440 Гц не детектится;
  - `createVoiceActivity({noiseFloor, sensitivity})` возвращает уровень 0..1.
- [ ] `mic.ts`:
  - `getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})`;
  - AnalyserNode, калибровка фона 1,5 с;
  - кадры через rAF, `stop()`;
  - ошибка доступа — состояние `denied` или `unavailable`.
- [ ] **«Подуй!»:** 3 сцены (свечи на торте, одуванчик, кораблик), прогресс по накопленной силе дутья, лимит сессии 2 мин, кнопка-заменитель «Удерживай».
- [ ] **«Лети, Муся!»:** Musicha поднимается при голосе и плавно опускается в тишине; звёзды на разной высоте; ползунок чувствительности (взрослый); кнопка-заменитель.
- [ ] **Тест:** отказ микрофона (мок `getUserMedia` с `NotAllowedError`) показывает кнопку «Удерживай».

### Task B6: «Oyna / Зеркальце» `features/exercises/mirror/` и `src/sensors/{camera,face}.ts`
- [ ] Экран: слева (на телефоне сверху) Ogizcha показывает позу, справа зеркало камеры (`<video>` с `scaleX(-1)`); счётчик повторов; удержание 3–5 с; кнопка взрослого «Получилось».
- [ ] `face.ts`:
  - ленивый импорт `@mediapipe/tasks-vision`;
  - `FilesetResolver.forVisionTasks(CDN wasm закреплённой версии)`;
  - `FaceLandmarker` (`outputFaceBlendshapes`, `runningMode: VIDEO`, `numFaces: 1`);
  - ≈15 fps;
  - калибровка нейтрального лица (2 с);
  - метрика упражнения = blendshape − baseline;
  - порог по умолчанию 0.25, настраиваемый.
- [ ] Упражнения без метрики (язык) — только зеркало и кнопка взрослого. Нет камеры или отказ — режим «только модель». Подпись «разминка».
- [ ] **Тесты:** функция оценки удержания (метрика выше порога ≥ holdMs даёт засчитанный повтор, дрожание ниже порога короче 150 мс не сбрасывает).

### Task B7: «Kun tartibi» и зона родителя `features/schedule/`, `features/parent/`
- [ ] **Расписание:** «Сначала → Потом» (2 слота) и «Мой день» (лента карточек, отметка «сделано» с наклейкой); шаблоны; редактирование за замком; печать.
- [ ] **ParentHome:** прогресс, советы, карточки (B2), профили, настройки, данные, печать, «О приложении».
- [ ] **Progress:** календарь 5 недель (дни с событиями), минуты (сессии), топ-10 слов, новые слова недели, игры и упражнения; поддерживающие формулировки.
- [ ] **Settings:** все поля `Profile` (тема, сенсорика, касание, сканирование, dwell, голос и громкости, подписи, цвет, уровень ядра), язык интерфейса, режим доски, PIN.
- [ ] **Data:**
  - экспорт (JSON + base64 аудио и фото → файл `.gapimiz`);
  - импорт с проверкой версии;
  - «Удалить всё» с подтверждением.
- [ ] **Print:** выбор темы или карточек → лист A4 с сеткой 3×4 через `@media print`.
- [ ] **About:** лицензии (Fluent Emoji MIT, Silero MIT, Nunito/Onest OFL, lucide ISC, MediaPipe Apache-2.0), приватность, дисклеймер.
- [ ] **Тесты:** экспорт и импорт (round-trip без потерь на фейковых данных); агрегаты прогресса (чистые функции).

### Task B8 (если хватит времени): «Hissiyotlar» и «Tovushlar»
- [ ] **«Эмоции»:** 6 эмоций; «Найди радостного»; «Покажи улыбку» (mouthSmile из `face.ts`).
- [ ] **«Звуки»:** р, ш, с, л, q, gʻ, x × 3 позиции × 4 слова; послушать → сказать → кнопка взрослого; запись и прослушивание попытки.

## Фаза C — Интеграция и качество (Workflow W3)

- [ ] C1. Playwright:
  - `smoke.spec.ts`: каждый роут открывается, нет `console.error` и непойманных исключений, переключение uz/uzc/ru;
  - `responsive.spec.ts`: 7 вьюпортов + доска с `boardMode=true`, скриншоты, проверка `scrollWidth <= innerWidth`, минимальный размер интерактивных элементов ≥ 44 px.
- [ ] C2. Ревью по линзам с адверсариальной проверкой: доступность; адаптив по скриншотам; узбекский и русский язык (носитель-уровень); баги и состояния; производительность; режим доски. Исправить подтверждённое.
- [ ] C3. Документация: README (ru/uz) со ссылкой на деплой, `docs/research/` (отчёт), `docs/LICENSES-ASSETS.md`, `scripts/README.md` (регенерация аудио и символов).

## Фаза D — Деплой

- [ ] D1. `.github/workflows/deploy.yml`: checkout → setup-node 24 → `npm ci` → typecheck → test → build → `peaceiris/actions-gh-pages@v4` (`publish_dir: dist`, `force_orphan: true`), `permissions: contents: write`.
- [ ] D2. Push. Убедиться, что `https://shakhzodmir.github.io/g/` отдаёт 200, SW регистрируется, офлайн-перезагрузка работает (Playwright против живого URL). Если Pages не включились сами, попросить основателя: Settings → Pages → Deploy from branch `gh-pages`.

## Самопроверка плана
- **Покрытие спеки:**
  - §4.1 → A9; §4.2 → B1 и B2; §4.3 → B3, B4 и B8; §4.4 → B5, B6 и B8; §4.5–4.6 → B7; §4.7 → A9 и B4 (2 игрока); §4.8 → A9 и B1 (клавиатура, взрослые фразы); §4.9 → A2, A5 и B7;
  - §5 → A6 и A7; §6 → A2 и A5; §7 → A9 и C1; §8 → A1–A8 и D; §9 → B7 (About, Data), глобальные ограничения.
- **Плейсхолдеры:** нет. Контент-объёмы заданы числами.
- **Типы:** `Bi`, `Word`, `Profile`, `SpeakItem`, `MascotState` используются одинаково во всех задачах.
- **Фокус ревью:** 5 пунктов закреплены тестами в A3, A4, A5, A8, B5 и B6.
