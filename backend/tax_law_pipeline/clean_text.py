import re

# Strips both real HTML tags (<br/>, etc.) and Korean legal revision-annotations (<개정 ...>).
# Both use ASCII angle brackets and neither is substantive legal content worth keeping in embedded text.
_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"[ \t　]+")
_NEWLINE_RE = re.compile(r"\n+")


def clean_text(text: str | None) -> str:
    if not text:
        return ""
    text = _TAG_RE.sub("", text)
    text = text.replace("　", " ")
    text = _WHITESPACE_RE.sub(" ", text)
    text = _NEWLINE_RE.sub(" ", text)
    return text.strip()
