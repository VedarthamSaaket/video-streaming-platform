#!/usr/bin/env python3
"""Fill the front Keynote document (Academic Modern theme) with the StreamVault deck."""
import subprocess
import sys
from pathlib import Path

from PIL import Image

SHOTS = Path("/Users/darthiedarte/Documents/devops_cbp/screenshots")
CARDS = Path(sys.argv[2]) if len(sys.argv) > 2 else SHOTS
SCRIPT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/streamvault_deck.applescript")

SERIF = "DomaineDisplay-Regular"
SANS = "FoundersGrotesk-Regular"

CREAM = (56540, 55769, 49344)
NAVY = (4883, 8224, 12079)
MUST = (50372, 36751, 12850)
RED = (26214, 5397, 2056)
ORANGE = (65535, 23130, 7967)

TOTAL = 10
KEEP = int(sys.argv[3]) if len(sys.argv) > 3 else 10 ** 6
slides = []


def slide(layout):
    slides.append({"layout": layout, "items": []})


def t(x, y, w, text, font=SANS, size=28, color=CREAM, rot=0, op=100):
    pitch = size * (1.02 if font == SERIF else 1.32)
    for i, line in enumerate(text.split("\n")):
        if line:
            slides[-1]["items"].append(("text", x, round(y + i * pitch), w, line, font, size, color, rot, op))


def img(x, y, w, path, rot=0):
    path = Path(path)
    with Image.open(path) as im:
        h = round(w * im.height / im.width)
    slides[-1]["items"].append(("image", x, y, w, h, str(path), rot))


def vid(x, y, w, name, rot=0, ratio=9 / 16):
    slides[-1]["items"].append(("movie", x, y, w, round(w * ratio), str(SHOTS / name), rot))


def shot(name):
    return SHOTS / name


def card(name):
    return CARDS / name


def page(n, color=CREAM):
    t(1730, 990, 160, f"{n:02d} / {TOTAL}", SANS, 20, color)


TEAM = ["Ch. Nandini  23071A6908", "Thanvika Devi  23071A6909", "T. Nayana  23071A6961", "V. Saaket  23071A6963", "V. Aashritha  23071A6964"]
COURSE = ["B.Tech IV Year I Semester", "CSE - IoT, VNRVJIET", "DevOps - Theory", "2026-2027"]

slide("Title")
t(-30, 470, 1900, "206", SERIF, 640, MUST, -8, 12)
t(60, 30, 1500, "STREAM", SERIF, 300, CREAM)
t(330, 300, 1500, "Vault.", SERIF, 300, MUST, -4)
t(80, 640, 1000, "A video streaming platform deployed with Docker,\nload balanced by NGINX, autoscaled on Kubernetes.", SANS, 40, CREAM)
img(1160, 520, 660, card("01-ui.jpg"), 6)
t(1300, 60, 520, "DEVOPS COURSE BASED PROJECT", SANS, 28, ORANGE, -8)
t(80, 790, 520, "\n".join(TEAM), SANS, 24, CREAM)
t(560, 790, 500, "\n".join(COURSE), SANS, 24, CREAM)
page(1)

slide("Blank")
t(60, 30, 900, "Uploads are writes.\nPlayback is reads.", SERIF, 90, NAVY)
t(70, 250, 760, "One server with a local disk cannot scale. StreamVault keeps every byte in MongoDB GridFS, so any pod can serve any video.", SANS, 30, NAVY)
t(70, 420, 700, "Deploy.", SERIF, 80, RED, -3)
t(250, 510, 700, "Load balance.", SERIF, 80, NAVY, 2)
t(110, 610, 700, "Autoscale.", SERIF, 80, RED, -4)
img(860, 60, 1000, card("19-architecture.jpg"), -2)
t(70, 800, 760, "Node.js 22 · MongoDB GridFS · Docker · NGINX\nKubernetes · Terraform · GitHub Actions\nPrometheus · Grafana", SANS, 30, NAVY)
t(900, 740, 950, "12 endpoints: health, readiness, metrics, list, upload, get, update, delete, stream, download, stats", SANS, 26, NAVY, 2)
page(2, NAVY)

slide("Fact")
t(40, 20, 900, "206", SERIF, 300, NAVY)
t(80, 330, 760, "Partial Content,\nthrough the proxy.", SERIF, 64, NAVY, -2)
vid(860, 70, 980, "20-ui-playback.mp4", 3, 900 / 1600)
img(80, 530, 760, card("range.png"), -3)
img(900, 680, 860, card("10-smoke-video.jpg"), 2)
t(80, 470, 760, "every seek is a new Range request", SANS, 30, RED, -2)
page(3, NAVY)

slide("Title & Text Alt")
t(70, 30, 1300, "Six streams at once.", SERIF, 120, CREAM)
vid(60, 200, 1260, "22-six-streams.mp4", 2, 900 / 1600)
t(1370, 230, 500, "6 players\n6 videos\n1 URL", SERIF, 96, MUST, -3)
t(1380, 640, 480, "Each label is the pod that served that player's latest chunk.", SANS, 30, CREAM)
page(4)

slide("Quote")
t(60, 30, 1800, "Containers on Kubernetes.", SERIF, 110, CREAM)
img(60, 190, 1120, card("02-docker-compose.jpg"), -2)
img(60, 470, 1120, card("04-kubernetes-pods.jpg"), 2)
img(820, 640, 1040, card("05-kubernetes-objects.jpg"), -3)
t(1240, 190, 620, "Compose: Mongo + 3 API + NGINX, all healthy", SANS, 32, MUST, 3)
t(1240, 380, 620, "kind: 3 API, 2 NGINX, 1 Mongo across 2 workers", SANS, 32, CREAM, -2)
t(80, 760, 680, "NGINX finds every pod through the headless service, every 5 s", SANS, 28, CREAM, -1)
page(5)

slide("Title & Bullets")
t(70, 30, 1800, "Autoscaling: 3 → 12 pods.", SERIF, 110, CREAM)
vid(60, 200, 1000, "23-autoscale-live.mp4", -2, 900 / 1600)
img(1100, 190, 760, card("hpa.png"), 3)
img(1120, 620, 740, card("13-top-pods.jpg"), -3)
img(80, 800, 620, card("11-hpa-scaleup.jpg"), 1)
t(760, 850, 340, "CPU target 60%\nNGINX 2 → 6", SANS, 28, MUST, 2)
page(6)

slide("Statement")
t(70, 30, 1200, "67,861", SERIF, 200, CREAM)
t(80, 240, 900, "requests, 17.9 GB, 0 errors", SANS, 40, MUST)
t(80, 320, 800, "421.5 req/s · p99 696 ms", SERIF, 64, CREAM, -2)
img(80, 440, 760, card("12-load-test.jpg"), -2)
img(1000, 50, 820, card("14-grafana-app.jpg"), 3)
img(960, 540, 820, card("15-grafana-runtime.jpg"), -2)
page(7)

slide("Blank")
t(60, 20, 700, "84", SERIF, 300, RED)
t(80, 330, 700, "tests, all passing.", SERIF, 64, NAVY, -2)
t(80, 430, 700, "33 unit · 51 integration\n90.45% lines covered\n20 Postman requests, 49 assertions", SANS, 32, NAVY)
img(760, 40, 560, card("06-unit-tests.jpg"), -3)
img(1320, 60, 560, card("07-integration-tests.jpg"), 3)
img(760, 450, 640, card("08-coverage.jpg"), 2)
img(1420, 440, 440, card("09-postman-newman.jpg"), -3)
t(80, 640, 640, "Jest, Supertest, mongodb-memory-server, Newman", SANS, 28, RED, -2)
page(8, NAVY)

slide("Title, Bullets & Live Video")
t(70, 30, 1800, "Five CI jobs. All green.", SERIF, 110, CREAM)
img(60, 200, 1140, card("18-ci.jpg"), -2)
img(1240, 190, 640, card("16-terraform.jpg"), 3)
img(1220, 600, 660, card("17-git-log.jpg"), -3)
t(80, 680, 1100, "lint + tests · manifests · terraform · image scan · kind deploy + Newman", SANS, 30, MUST, -1)
t(80, 780, 1100, "Terraform describes the AWS version: VPC, EKS, ECR, IRSA, Helm add-ons.", SANS, 30, CREAM, -1)
page(9)

slide("Title")
t(-30, 380, 1900, "206", SERIF, 640, MUST, 6, 12)
t(60, 40, 1600, "Thank you.", SERIF, 220, CREAM)
for i, (num, label) in enumerate([("84", "tests"), ("12", "API pods"), ("67,861", "requests"), ("0", "errors"), ("5/5", "CI jobs")]):
    t(80 + i * 340, 320 + (i % 2) * 30, 330, num, SERIF, 96, MUST if i % 2 else CREAM, (-3, 2)[i % 2])
    t(90 + i * 340, 430 + (i % 2) * 30, 330, label, SANS, 30, CREAM, (-3, 2)[i % 2])
t(80, 600, 600, "\n".join(TEAM), SANS, 30, CREAM)
t(720, 600, 600, "\n".join(COURSE), SANS, 30, CREAM)
t(80, 900, 1200, "github.com/VedarthamSaaket/video-streaming-platform", SANS, 30, ORANGE)
page(10)


def q(text):
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def rgb(c):
    return "{" + ", ".join(str(v) for v in c) + "}"


HANDLERS = """on clean(s)
  tell application id "com.apple.Keynote"
    repeat with k from (count of text items of s) to 1 by -1
      set ti to text item k of s
      if object text of ti is "" then
        set p to position of ti
        if (item 2 of p) is 985 and (item 1 of p) is 72 then
          set object text of ti to "StreamVault"
        else if (item 2 of p) is 985 and (item 1 of p) is 371 then
          set object text of ti to "October 2026"
        else
          try
            delete ti
          end try
        end if
      end if
    end repeat
    repeat with k from (count of shapes of s) to 1 by -1
      try
        if object text of shape k of s is "" then delete shape k of s
      end try
    end repeat
  end tell
end clean
on addText(s, theText, x, y, w, fontName, fontSize, col, rot, opac)
  tell application id "com.apple.Keynote"
    tell s to set ti to make new text item with properties {object text:theText, position:{x, y}, width:w}
    tell object text of ti
      set font to fontName
      set size to fontSize
    end tell
    set color of object text of ti to col
    set position of ti to {x, y}
    if rot is not 0 then set rotation of ti to (rot + 360) mod 360
    if opac is not 100 then set opacity of ti to opac
  end tell
end addText
on addImage(s, p, x, y, w, h, rot)
  tell application id "com.apple.Keynote"
    tell s to set im to make new image with properties {file:POSIX file p, position:{x, y}, width:w, height:h}
    if rot is not 0 then set rotation of im to (rot + 360) mod 360
  end tell
end addImage
on addMovie(s, p, x, y, w, h, rot)
  tell application id "com.apple.Keynote"
    tell s to set m to make new image with properties {file:POSIX file p, position:{x, y}, width:w, height:h}
    set repetition method of m to loop
    if rot is not 0 then set rotation of m to (rot + 360) mod 360
  end tell
end addMovie
"""


def build():
    out = [HANDLERS, 'tell application id "com.apple.Keynote"', "  with timeout of 1800 seconds", "  set d to front document"]
    out.append(f"  repeat while (count of slides of d) > {KEEP}")
    out.append("    delete last slide of d")
    out.append("  end repeat")
    for sl in slides:
        out.append(f'  set s to make new slide at end of d with properties {{base slide:slide layout "{sl["layout"]}" of d}}')
        out.append("  set title showing of s to false")
        out.append("  set body showing of s to false")
        out.append("  try\n    delete every image of s\n  end try")
        out.append("  my clean(s)")
        for item in sl["items"]:
            if item[0] == "text":
                _, x, y, w, text, font, size, col, rot, op = item
                out.append(f'  my addText(s, {q(text)}, {x}, {y}, {w}, "{font}", {size}, {rgb(col)}, {rot}, {op})')
            elif item[0] == "image":
                _, x, y, w, h, path, rot = item
                out.append(f'  my addImage(s, "{path}", {x}, {y}, {w}, {h}, {rot})')
            else:
                _, x, y, w, h, path, rot = item
                out.append(f'  my addMovie(s, "{path}", {x}, {y}, {w}, {h}, {rot})')
    out += ["  return count of slides of d", "  end timeout", "end tell"]
    SCRIPT.write_text("\n".join(out) + "\n")


if __name__ == "__main__":
    build()
    result = subprocess.run(["osascript", str(SCRIPT)], capture_output=True, text=True)
    print(result.stdout.strip(), result.stderr.strip())
    sys.exit(result.returncode)
