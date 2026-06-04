import argparse
import json
import sys
from pathlib import Path

from faster_whisper import WhisperModel


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def load_model(model_name: str, models_dir: str) -> WhisperModel:
    Path(models_dir).mkdir(parents=True, exist_ok=True)
    log(f"Loading local Whisper model: {model_name}")
    log(f"Model cache: {models_dir}")
    return WhisperModel(
        model_name,
        device="cpu",
        compute_type="int8",
        download_root=models_dir,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Local faster-whisper runner for PodNote Desktop.")
    parser.add_argument("--model", required=True)
    parser.add_argument("--models-dir", required=True)
    parser.add_argument("--audio")
    parser.add_argument("--download-only", action="store_true")
    args = parser.parse_args()

    model = load_model(args.model, args.models_dir)
    if args.download_only:
      print(json.dumps({"ok": True, "model": args.model}), flush=True)
      return

    if not args.audio:
        raise ValueError("--audio is required unless --download-only is set")

    log(f"Transcribing: {args.audio}")
    segments, info = model.transcribe(
        args.audio,
        vad_filter=False,
        beam_size=5,
    )

    parts = []
    for segment in segments:
        text = segment.text.strip()
        if text:
            parts.append(text)
            log(f"[{segment.start:.1f}s -> {segment.end:.1f}s] {text}")

    print(
        json.dumps(
            {
                "ok": True,
                "model": args.model,
                "language": info.language,
                "duration": info.duration,
                "transcript": " ".join(parts).strip(),
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
