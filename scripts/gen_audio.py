"""Generate speech clips with Silero `v5_cis_base_nostress` (MIT) for every manifest entry.

Usage:
  python -I scripts/gen_audio.py <manifest.json> <v5_cis_base_nostress.pt> <repo_root> [--force]

Requirements: Python 3.10+, `pip install torch numpy` (CPU is enough), ffmpeg on PATH.
Model: https://models.silero.ai/models/tts/ru/v5_cis_base_nostress.pt (MIT, see silero-models LICENSE_CIS).
Voices: Uzbek `uzb_saida`, Russian `ru_saida` (the same persona speaks both languages).
Output: public/audio/<lang>/<key>.mp3 (mono, 24 kHz, 40 kbit/s, loudness-normalized, trimmed)
        src/content/audio-index.json  ({"uz": [keys], "ru": [keys]})
        src/content/audio-versions.json  ({"uz": {key: 8-hex}, "ru": {...}}): the clip URL carries ?v=<8-hex> so a
        regenerated clip is a new URL and reaches installed devices (the service worker cache is CacheFirst).
"""
import hashlib
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import torch

SPEAKERS = {"uz": "uzb_saida", "ru": "ru_saida"}
SAMPLE_RATE = 48000
FILTERS = (
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
    "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,"
    "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.06"
)


def save_wav(path: Path, audio: torch.Tensor) -> None:
    pcm = (audio.clamp(-1, 1) * 32767).to(torch.int16).cpu().numpy().tobytes()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm)


def main() -> None:
    manifest_path, model_path, repo = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    force = "--force" in sys.argv
    entries = json.loads(manifest_path.read_text(encoding="utf-8"))
    out_root = repo / "public" / "audio"
    hashes_path = repo / "scripts" / "audio-hashes.json"
    hashes = json.loads(hashes_path.read_text(encoding="utf-8")) if hashes_path.exists() else {}

    torch.set_num_threads(4)
    model = torch.package.PackageImporter(str(model_path)).load_pickle("tts_models", "model")
    model.to(torch.device("cpu"))

    made, kept, failed = 0, 0, []
    with tempfile.TemporaryDirectory() as tmp:
        for e in entries:
            lang, key, text = e["lang"], e["key"], e["text"].strip()
            out = out_root / lang / f"{key}.mp3"
            digest = hashlib.sha1(f"{SPEAKERS[lang]}|{text}".encode("utf-8")).hexdigest()
            hkey = f"{lang}:{key}"
            if not force and out.exists() and hashes.get(hkey) == digest:
                kept += 1
                continue
            try:
                audio = model.apply_tts(text=text, speaker=SPEAKERS[lang], sample_rate=SAMPLE_RATE)
                wav = Path(tmp) / "clip.wav"
                save_wav(wav, audio)
                out.parent.mkdir(parents=True, exist_ok=True)
                subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-af", FILTERS,
                     "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "40k", str(out)],
                    check=True,
                )
                hashes[hkey] = digest
                made += 1
            except Exception as ex:  # noqa: BLE001
                failed.append(f"{hkey}: {ex}")

    index = {lang: sorted(p.stem for p in (out_root / lang).glob("*.mp3")) for lang in ("uz", "ru")}
    (repo / "src" / "content" / "audio-index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    versions = {
        lang: {k: hashes[f"{lang}:{k}"][:8] for k in index[lang] if f"{lang}:{k}" in hashes} for lang in ("uz", "ru")
    }
    (repo / "src" / "content" / "audio-versions.json").write_text(
        json.dumps(versions, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    hashes_path.write_text(json.dumps(hashes, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
    print(f"audio: {made} generated, {kept} unchanged, {len(failed)} failed; index uz={len(index['uz'])} ru={len(index['ru'])}")
    for f in failed:
        print("FAIL", f)


if __name__ == "__main__":
    main()
