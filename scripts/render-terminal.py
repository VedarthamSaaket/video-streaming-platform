#!/usr/bin/env python3
"""Render captured terminal output as a polished HTML terminal window."""
import argparse
import html
import os
import re

COLORS = {
    "green": "#4ade80",
    "red": "#f87171",
    "blue": "#7aa2ff",
    "yellow": "#fbbf24",
    "muted": "#7f8ea8",
    "text": "#e8eefc",
}


def classify(line):
    stripped = line.strip()
    if stripped.startswith("$ "):
        return "cmd"
    if re.match(r"^(PASS|✓|ok|OK|READY|Ready|complete|Created|created|connected|Uploaded|Smoke test passed)", stripped):
        return "ok"
    if re.search(r"(FAIL|Error|error|not found|refused|CrashLoop|BackOff|OOMKilled)", stripped):
        return "bad"
    if re.match(r"^(NAME|NAMESPACE|REPOSITORY|TARGET|CONNECTIONS|DURATION|RANGE|Cluster|Client|Server)", stripped):
        return "header"
    if re.match(r"^[A-Za-z0-9_.-]+\s{2,}(Running|Ready|Completed|Pending|1/1|2/2|3/3)", stripped):
        return "row"
    if stripped.startswith(("http://", "https://")):
        return "url"
    return ""


def colorize(line):
    cls = classify(line)
    escaped = html.escape(line.expandtabs(2))
    if cls == "cmd":
        return f'<span class="cmd">{escaped}</span>'
    if cls == "ok":
        return f'<span class="ok">{escaped}</span>'
    if cls == "bad":
        return f'<span class="bad">{escaped}</span>'
    if cls == "header":
        return f'<span class="header">{escaped}</span>'
    if cls == "url":
        return f'<span class="url">{escaped}</span>'
    if cls == "row":
        return f'<span class="row">{escaped}</span>'
    # Highlight JSON keys and status codes lightly.
    escaped = re.sub(r"(&quot;[^&]+?&quot;)(\s*:)", r'<span class="key">\1</span>\2', escaped)
    escaped = re.sub(r"\b(206|201|200|204|404|416|503)\b", r'<span class="status">\1</span>', escaped)
    return escaped


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--max-lines", type=int, default=80)
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8", errors="replace") as handle:
        lines = [line.rstrip("\n") for line in handle][: args.max_lines]

    rendered = "\n".join(colorize(line) for line in lines)
    title = html.escape(args.title)

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  :root {{
    --bg: #070a12;
    --panel: #0b111d;
    --border: #23324d;
    --text: #e8eefc;
    --muted: #7f8ea8;
    --accent: #6b8fff;
    --accent2: #9a6bff;
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; }}
  body {{
    padding: 40px 44px;
    background:
      radial-gradient(1000px 520px at 8% -10%, rgba(107,143,255,.24), transparent 60%),
      radial-gradient(900px 500px at 100% 0%, rgba(154,107,255,.20), transparent 55%),
      linear-gradient(160deg, #05070d 0%, #090e1a 55%, #060910 100%);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif;
  }}
  .window {{
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(13,19,32,.98), rgba(8,12,20,.98));
    box-shadow: 0 30px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.02) inset;
    overflow: hidden;
  }}
  .bar {{
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 14px 18px;
    border-bottom: 1px solid #1b2740;
    background: linear-gradient(180deg, #121b2c, #0d1524);
  }}
  .dot {{ width: 12px; height: 12px; border-radius: 50%; }}
  .red {{ background: #ff5f57; }}
  .yellow {{ background: #febc2e; }}
  .green {{ background: #28c840; }}
  .bar-title {{
    margin-left: 12px;
    color: #c7d3e8;
    font-family: "SF Mono", ui-monospace, Menlo, monospace;
    font-size: 13px;
    letter-spacing: .02em;
  }}
  .bar-meta {{
    margin-left: auto;
    color: var(--muted);
    font-family: "SF Mono", ui-monospace, Menlo, monospace;
    font-size: 11px;
    letter-spacing: .08em;
    text-transform: uppercase;
  }}
  pre {{
    margin: 0;
    padding: 26px 30px 30px;
    color: var(--text);
    font-family: "SF Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 15px;
    line-height: 1.62;
    white-space: pre-wrap;
    word-break: break-word;
    tab-size: 2;
  }}
  .cmd {{ color: #f1f5ff; font-weight: 600; }}
  .cmd::first-letter {{ color: var(--accent); }}
  .ok {{ color: #4ade80; }}
  .bad {{ color: #f87171; }}
  .header {{ color: #8ea6cc; font-weight: 700; letter-spacing: .03em; }}
  .row {{ color: #d5e2f7; }}
  .url {{ color: #7aa2ff; }}
  .key {{ color: #8bb4ff; }}
  .status {{ color: #4ade80; font-weight: 700; }}
</style>
</head>
<body>
  <div class="window">
    <div class="bar">
      <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
      <span class="bar-title">{title}</span>
      <span class="bar-meta">streamvault · {os.uname().nodename}</span>
    </div>
    <pre>{rendered}</pre>
  </div>
</body>
</html>
"""
    with open(args.output, "w", encoding="utf-8") as handle:
        handle.write(page)
    print(args.output)


if __name__ == "__main__":
    main()
