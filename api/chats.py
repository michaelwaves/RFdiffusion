import json
import os

CHATS_ROOT = "/workspace/RFdiffusion/outputs/chats"


def transcript_path(chat_id: str) -> str:
    return os.path.join(CHATS_ROOT, f"{chat_id}.json")


def save_transcript(chat_id: str, messages: list[dict]) -> None:
    os.makedirs(CHATS_ROOT, exist_ok=True)
    with open(transcript_path(chat_id), "w") as f:
        json.dump(messages, f)


def load_transcript(chat_id: str) -> list[dict]:
    path = transcript_path(chat_id)
    if not os.path.isfile(path):
        return []
    with open(path) as f:
        return json.load(f)


def list_chats() -> list[dict]:
    if not os.path.isdir(CHATS_ROOT):
        return []
    chats = []
    for filename in sorted(os.listdir(CHATS_ROOT), reverse=True):
        if not filename.endswith(".json"):
            continue
        chat_id = filename.removesuffix(".json")
        messages = load_transcript(chat_id)
        preview = ""
        for msg in messages:
            if msg.get("role") == "user":
                preview = str(msg.get("content", ""))[:80]
        chats.append({"chat_id": chat_id, "preview": preview})
    return chats
