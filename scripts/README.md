# Скрипты ассетов

## Символы (Fluent Emoji 3D, MIT)
```bash
node scripts/fetch-symbols.mjs          # скачивает то, чего ещё нет
node scripts/fetch-symbols.mjs --force  # перекачать всё
```
Соответствие «id символа → путь в репозитории microsoft/fluentui-emoji» лежит в `scripts/symbol-map.json`. Собственные символы (`custom:*.svg`) находятся в `public/symbols/custom/`; их рисует `node scripts/gen-custom-symbols.mjs`, а id нужно добавить в `CUSTOM_SYMBOLS` (`src/ui/SymbolImg.tsx`). Для людей используется оттенок кожи Medium (тёмные волосы).

## Озвучка (Silero v5_cis_base_nostress, MIT)
1. `npx tsx scripts/build-audio-manifest.ts` собирает все тексты в `scripts/.cache/audio-manifest.json`.
2. Один раз подготовьте окружение: Python 3.10+, `pip install torch numpy` (CPU), ffmpeg в PATH. Скачайте модель https://models.silero.ai/models/tts/ru/v5_cis_base_nostress.pt.
3. `python -I scripts/gen_audio.py scripts/.cache/audio-manifest.json <путь к модели .pt> .`

Генерируются только новые или изменённые фразы (хеши хранятся в `scripts/audio-hashes.json`). Результат пишется в `public/audio/{uz,ru}/*.mp3` и `src/content/audio-index.json`.

Голоса: `uzb_saida` (узбекский) и `ru_saida` (русский). Это один голос-персонаж на обоих языках, а по распознаванию он даёт 0 % ошибок на тестовых фразах. Узбекский текст подаётся в синтез кириллицей.

> Синтетический голос — временное решение для v0.1. К пилоту его заменяет запись диктора. Файлы просто кладутся с теми же именами.

## Шрифты
`node scripts/copy-fonts.mjs` копирует подмножества Nunito и Onest (latin, latin-ext, cyrillic, cyrillic-ext) в `src/design/fonts/`.
