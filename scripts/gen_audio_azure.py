"""Generate the speech clips with Microsoft Azure Neural TTS instead of Silero.

Usage (from the repo root, no extra packages needed — standard library only; ffmpeg on PATH):
  npx tsx scripts/build-audio-manifest.ts
  python -I scripts/gen_audio_azure.py [--force] [--only uz|ru] [--limit N] [--rate 60]

Credentials: put them in `.env.local` in the repo root (git-ignored), never in the code or the chat:
  AZURE_SPEECH_KEY=<key of an Azure "Speech" resource>
  AZURE_SPEECH_REGION=<region, e.g. westeurope or swedencentral>
Optional overrides: AZURE_VOICE_UZ (default uz-UZ-MadinaNeural), AZURE_VOICE_RU (default ru-RU-SvetlanaNeural),
AZURE_RATE (prosody rate, default -8% — a little slower for children).

Pricing (checked 16.10.2026): Neural TTS $15 per 1M characters; the free F0 tier gives 0.5M characters a month.
The whole manifest is about 20 000 characters, so generation is free. F0 allows ~20 requests a minute, so the
script throttles (--rate, requests per minute) and retries on HTTP 429; it is resumable (hashes in scripts/audio-hashes.json).

Output is identical to gen_audio.py: public/audio/<lang>/<key>.mp3 (mono, 24 kHz, loudness-normalised, trimmed),
src/content/audio-index.json and src/content/audio-versions.json.

Notes
- uz-UZ voices read Uzbek LATIN text; the manifest field `latin` is used (canonical Latin with ʻ / ʼ).
- Russian uses the `plain` field (no '+' stress marks — Azure places stress itself).
- Azure uz-UZ has no phoneme/lexicon/viseme support, so a mispronounced word is fixed by rewriting its text (`uzTts`).
- The Azure terms ask apps to disclose that voices are synthetic: the About screen says so.
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent


def load_env() -> None:
    f = ROOT / ".env.local"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


FILTERS = (
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
    "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,"
    "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.06"
)


def ssml(voice: str, lang_tag: str, text: str, rate: str) -> bytes:
    body = escape(text)
    return (
        f"<speak version='1.0' xml:lang='{lang_tag}' xmlns='http://www.w3.org/2001/10/synthesis'>"
        f"<voice name='{voice}'><prosody rate='{rate}'>{body}</prosody></voice></speak>"
    ).encode("utf-8")


def synth(region: str, key: str, payload: bytes) -> bytes:
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=payload,
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
            "User-Agent": "gapimiz-audio",
        },
        method="POST",
    )
    delay = 5.0
    for attempt in range(8):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 7:
                wait = float(e.headers.get("Retry-After") or delay)
                time.sleep(wait)
                delay = min(delay * 2, 60)
                continue
            raise RuntimeError(f"HTTP {e.code}: {e.read()[:200]!r}") from e
        except urllib.error.URLError:
            if attempt < 7:
                time.sleep(delay)
                delay = min(delay * 2, 60)
                continue
            raise
    raise RuntimeError("unreachable")


def main() -> None:
    load_env()
    args = sys.argv[1:]
    force = "--force" in args
    only = args[args.index("--only") + 1] if "--only" in args else None
    limit = int(args[args.index("--limit") + 1]) if "--limit" in args else None
    per_minute = float(args[args.index("--rate") + 1]) if "--rate" in args else 18.0  # F0 ≈ 20/min; S0 can use 600+
    key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    if not key or not region:
        sys.exit("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env.local (see the docstring).")
    voices = {
        "uz": (os.environ.get("AZURE_VOICE_UZ", "uz-UZ-MadinaNeural"), "uz-UZ"),
        "ru": (os.environ.get("AZURE_VOICE_RU", "ru-RU-SvetlanaNeural"), "ru-RU"),
    }
    rate = os.environ.get("AZURE_RATE", "-8%")

    manifest = json.loads((ROOT / "scripts" / ".cache" / "audio-manifest.json").read_text(encoding="utf-8"))
    out_root = ROOT / "public" / "audio"
    hashes_path = ROOT / "scripts" / "audio-hashes.json"
    hashes = json.loads(hashes_path.read_text(encoding="utf-8")) if hashes_path.exists() else {}

    made = kept = 0
    failed: list[str] = []
    gap = 60.0 / per_minute
    with tempfile.TemporaryDirectory() as tmp:
        for e in manifest:
            lang, k = e["lang"], e["key"]
            if only and lang != only:
                continue
            text = (e.get("latin") if lang == "uz" else e.get("plain")) or ""
            if not text:
                # Older manifests only carry the Silero text: Russian can drop the '+' marks, Uzbek cannot be used.
                if lang == "ru":
                    text = e["text"].replace("+", "")
                else:
                    failed.append(f"{lang}:{k}: manifest has no `latin` text (rebuild the manifest)")
                    continue
            voice, tag = voices[lang]
            digest = hashlib.sha1(f"azure|{voice}|{rate}|{text}".encode("utf-8")).hexdigest()
            hkey = f"{lang}:{k}"
            out = out_root / lang / f"{k}.mp3"
            if not force and out.exists() and hashes.get(hkey) == digest:
                kept += 1
                continue
            if limit is not None and made >= limit:
                break
            try:
                started = time.time()
                mp3 = synth(region, key, ssml(voice, tag, text, rate))
                raw = Path(tmp) / "clip.mp3"
                raw.write_bytes(mp3)
                out.parent.mkdir(parents=True, exist_ok=True)
                subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", FILTERS, "-ac", "1", "-ar", "24000",
                     "-codec:a", "libmp3lame", "-b:a", "40k", str(out)],
                    check=True,
                )
                hashes[hkey] = digest
                made += 1
                if made % 25 == 0:
                    hashes_path.write_text(json.dumps(hashes, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
                    print(f"  {made} generated…", flush=True)
                time.sleep(max(0.0, gap - (time.time() - started)))
            except Exception as ex:  # noqa: BLE001
                failed.append(f"{hkey}: {ex}")

    index = {lang: sorted(p.stem for p in (out_root / lang).glob("*.mp3")) for lang in ("uz", "ru")}
    (ROOT / "src" / "content" / "audio-index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    versions = {lang: {k: hashes[f"{lang}:{k}"][:8] for k in index[lang] if f"{lang}:{k}" in hashes} for lang in ("uz", "ru")}
    (ROOT / "src" / "content" / "audio-versions.json").write_text(json.dumps(versions, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    hashes_path.write_text(json.dumps(hashes, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
    print(f"azure: {made} generated, {kept} unchanged, {len(failed)} failed; index uz={len(index['uz'])} ru={len(index['ru'])}")
    for f in failed[:40]:
        print("FAIL", f)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
