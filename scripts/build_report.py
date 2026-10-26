#!/usr/bin/env python3
"""Build the StreamVault WIL report and overwrite the original DOCX in place."""
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor
from PIL import Image

ROOT = Path("/Users/darthiedarte/development/video-streaming-platform")
SHOTS = ROOT / "docs" / "screenshots"
ARCH = ROOT / "docs" / "diagrams" / "architecture.png"
OUT_DIR = Path("/Users/darthiedarte/Documents/devops_cbp")
OUT = OUT_DIR / "WIL Report DevOps.docx"

TEAM = [
    ("23071A6908", "CH. NANDINI"),
    ("23071A6909", "THANVIKA DEVI"),
    ("23071A6961", "T. NAYANA"),
    ("23071A6963", "V. SAAKET"),
    ("23071A6964", "V. AASHRITHA"),
]

FIG = {"n": 0, "list": []}


def style_document(doc):
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(1.8)

    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(11.5)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    normal.paragraph_format.line_spacing = 1.12
    normal.paragraph_format.space_after = Pt(6)

    for name, size in (("Heading 1", 16), ("Heading 2", 13), ("Heading 3", 11.5)):
        style = doc.styles[name]
        style.font.name = "Times New Roman"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.space_before = Pt(14 if size > 12 else 10)
        style.paragraph_format.space_after = Pt(6)

    # Page number in the footer.
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_end)

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hrun = header.add_run("StreamVault · DevOps CBP · 2026-2027")
    hrun.font.name = "Times New Roman"
    hrun.font.size = Pt(8.5)
    hrun.font.color.rgb = RGBColor(100, 100, 100)


def para(doc, text="", bold_lead=None, size=None, italic=False, align=None, space_after=None):
    paragraph = doc.add_paragraph()
    if align is not None:
        paragraph.alignment = align
    if bold_lead:
        run = paragraph.add_run(bold_lead)
        run.bold = True
        if size:
            run.font.size = Pt(size)
    run = paragraph.add_run(text)
    run.italic = italic
    if size:
        run.font.size = Pt(size)
    if space_after is not None:
        paragraph.paragraph_format.space_after = Pt(space_after)
    return paragraph


def bullets(doc, items):
    for item in items:
        paragraph = doc.add_paragraph(style="List Bullet")
        if isinstance(item, tuple):
            lead, rest = item
            run = paragraph.add_run(lead)
            run.bold = True
            paragraph.add_run(rest)
        else:
            paragraph.add_run(item)
        paragraph.paragraph_format.space_after = Pt(3)


def numbered(doc, items):
    for item in items:
        paragraph = doc.add_paragraph(style="List Number")
        if isinstance(item, tuple):
            lead, rest = item
            run = paragraph.add_run(lead)
            run.bold = True
            paragraph.add_run(rest)
        else:
            paragraph.add_run(item)
        paragraph.paragraph_format.space_after = Pt(3)


def shade(cell, fill="E8EDF5"):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def table(doc, headers, rows, widths=None, font_size=10):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = tbl.rows[0].cells
    for index, header in enumerate(headers):
        hdr[index].text = ""
        run = hdr[index].paragraphs[0].add_run(header)
        run.bold = True
        run.font.size = Pt(font_size)
        run.font.name = "Times New Roman"
        shade(hdr[index])
    for row in rows:
        cells = tbl.add_row().cells
        for index, value in enumerate(row):
            cells[index].text = ""
            run = cells[index].paragraphs[0].add_run(str(value))
            run.font.size = Pt(font_size)
            run.font.name = "Times New Roman"
    if widths:
        for row in tbl.rows:
            for index, width in enumerate(widths):
                row.cells[index].width = Cm(width)
    return tbl


def figure(doc, path, caption, max_width=17.0, max_height=20.0):
    path = Path(path)
    if not path.exists():
        return
    with Image.open(path) as image:
        width_px, height_px = image.size
    width_cm = max_width
    height_cm = width_cm * height_px / width_px
    if height_cm > max_height:
        height_cm = max_height
        width_cm = height_cm * width_px / height_px
    doc.add_picture(str(path), width=Cm(width_cm), height=Cm(height_cm))
    doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    FIG["n"] += 1
    FIG["list"].append((str(FIG["n"]), caption, path.name))
    caption_par = doc.add_paragraph()
    caption_par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = caption_par.add_run(f"Figure {FIG['n']}. {caption}")
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(80, 80, 80)
    caption_par.paragraph_format.space_after = Pt(10)


def build():
    doc = Document()
    style_document(doc)

    # Cover.
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("Report on WIL")
    run.bold = True
    run.font.size = Pt(24)
    run.font.name = "Times New Roman"

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("Why am I Learning, What I am Learning")
    run.bold = True
    run.font.size = Pt(14)

    line = doc.add_paragraph()
    line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = line.add_run("B.Tech. IV Year I Semester – CSE – IoT")
    run.bold = True

    line = doc.add_paragraph()
    line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = line.add_run("Subject Name: DevOps - Theory\tAcademic Year: 2026-2027")
    run.bold = True
    run.font.name = "Arial"

    doc.add_paragraph()
    table(
        doc,
        ["Roll.No", "Name", "Course"],
        [(roll, name.title(), "CSE – IoT") for roll, name in TEAM],
        widths=[4.5, 7.5, 4.5],
        font_size=11,
    )

    doc.add_paragraph()
    cover = doc.add_paragraph()
    cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = cover.add_run(
        "Project: StreamVault, a video streaming platform deployed with Docker, NGINX and Kubernetes"
    )
    run.bold = True
    run.font.size = Pt(12)

    para(
        doc,
        "All five members took part in the design, implementation, testing, deployment and review of "
        "the project. The work was carried out on macOS with Docker, kind, kubectl, Node.js 22 and "
        "Terraform 1.17.",
        size=11,
    )

    doc.add_page_break()

    doc.add_heading("Contents", level=1)
    for item in [
        "1. Abstract",
        "2. Why we chose this problem",
        "3. What the platform does",
        "4. Architecture",
        "5. Technology stack",
        "6. Implementation",
        "7. Testing: unit, integration, coverage and Postman",
        "8. Running the platform with Docker Compose",
        "9. Deploying to Kubernetes",
        "10. Autoscaling and load results",
        "11. Observability with Prometheus and Grafana",
        "12. Cloud infrastructure with Terraform",
        "13. CI/CD pipeline",
        "14. Problems found and fixed",
        "15. What we learnt",
        "16. Future scope",
        "17. Conclusion",
        "Appendix A. Command reference",
        "Appendix B. Evidence index",
    ]:
        para(doc, item, space_after=2)

    # 1 Abstract.
    doc.add_heading("1. Abstract", level=1)
    para(
        doc,
        "StreamVault is a video streaming platform built for the DevOps course. The API is written in "
        "Node.js and stores metadata and video bytes in MongoDB GridFS, so every instance is "
        "stateless. NGINX is the edge proxy, Kubernetes runs three API replicas, and a "
        "HorizontalPodAutoscaler grows the deployment to twelve replicas when CPU crosses sixty "
        "percent. The project also includes eighty four automated tests, a Postman collection run by "
        "Newman, two Grafana dashboards fed by Prometheus, a Terraform stack for AWS, and a five job "
        "GitHub Actions pipeline.",
    )
    para(
        doc,
        "The final build was executed end to end on a three node kind cluster. It served 67,861 "
        "requests and 17.9 GB of video in a 180 second load test with zero errors and zero timeouts, "
        "while scaling from three API pods and two NGINX pods to twelve and six respectively. The "
        "project shows the complete path from code to a running, observable, autoscaled deployment.",
    )

    # 2 Motivation.
    doc.add_heading("2. Why we chose this problem", level=1)
    para(
        doc,
        "A video platform has two different traffic patterns. Uploads are large sequential writes. "
        "Playback is many concurrent byte range reads. A single server with a local disk handles the "
        "demo, but adding a second server immediately creates a question: where is the video stored, "
        "and which server owns it?",
    )
    para(
        doc,
        "That question makes video a useful DevOps project. It forces us to separate state from "
        "compute, to put a real proxy in front of the application, to preserve HTTP range semantics "
        "across that proxy, and to let Kubernetes add replicas without a shared local disk. The same "
        "ideas apply to any read heavy service, but video makes the failure modes easy to see.",
    )
    para(
        doc,
        "The course topic was container orchestration, load balancing and scalability. Instead of "
        "describing those ideas on slides, we built a system where every claim can be checked with a "
        "command and a screenshot.",
    )

    # 3 What it does.
    doc.add_heading("3. What the platform does", level=1)
    para(
        doc,
        "A user can upload a video, browse the library, play it in the browser, seek inside it, "
        "download it and delete it. The player issues HTTP range requests when the user seeks, and the "
        "API answers with 206 Partial Content. The browser UI also shows which pod answered the last "
        "health request.",
    )
    para(
        doc,
        "The API is deliberately small. Every endpoint is covered by a Jest test and by the Postman "
        "collection.",
    )
    table(
        doc,
        ["Method", "Path", "Purpose"],
        [
            ("GET", "/healthz", "Liveness probe"),
            ("GET", "/readyz", "Readiness probe, checks MongoDB and GridFS"),
            ("GET", "/health", "Detailed health for the current instance"),
            ("GET", "/metrics", "Prometheus metrics"),
            ("GET", "/api/videos", "List videos with page, limit and search"),
            ("POST", "/api/videos", "Upload a video as multipart form data"),
            ("GET", "/api/videos/:id", "Video metadata"),
            ("PATCH", "/api/videos/:id", "Update title, description or uploader"),
            ("DELETE", "/api/videos/:id", "Delete metadata and the GridFS file"),
            ("GET", "/api/videos/:id/stream", "Stream with Range support"),
            ("GET", "/api/videos/:id/download", "Download as an attachment"),
            ("GET", "/api/stats", "Library totals and serving instance"),
        ],
        widths=[2.2, 6.2, 8.0],
    )

    # 4 Architecture.
    doc.add_heading("4. Architecture", level=1)
    para(
        doc,
        "The request path is deliberately simple. A browser or curl connects to the NGINX NodePort. "
        "NGINX resolves the headless API service every five seconds, so every ready pod is in the "
        "rotation. Each API pod reads and writes MongoDB, and GridFS stores the video bytes in two "
        "collections, media.files and media.chunks.",
    )
    figure(doc, ARCH, "StreamVault deployment architecture")
    para(
        doc,
        "The API has no local video directory. Multer writes the upload to a temporary file, the "
        "GridFS driver streams it into MongoDB, and the temporary file is removed. A download opens a "
        "GridFS download stream at the requested byte offset. Because no pod owns the bytes, any "
        "replica can serve any request, which is what makes horizontal scaling possible.",
    )
    para(
        doc,
        "NGINX is configured with proxy_buffering off and proxy_request_buffering off, so uploads and "
        "streams pass through without waiting for a full buffer. The Range and If-Range headers are "
        "forwarded unchanged. A headless service is used on purpose: a normal ClusterIP would hide the "
        "pod IPs behind kube-proxy, while a headless service returns the pod IPs so NGINX performs the "
        "round robin itself.",
    )

    # 5 Stack.
    doc.add_heading("5. Technology stack", level=1)
    table(
        doc,
        ["Layer", "Technology", "Role"],
        [
            ("Runtime", "Node.js 22, Express", "HTTP API, streaming and uploads"),
            ("Database", "MongoDB 7, GridFS", "Metadata and video bytes"),
            ("Validation", "Zod, Mongoose", "Request and schema validation"),
            ("Logging", "Pino, pino-http", "Structured JSON logs with request ids"),
            ("Metrics", "prom-client", "Prometheus counters, gauges and histograms"),
            ("Edge", "NGINX 1.27", "Reverse proxy, load balancing, range passthrough"),
            ("Containers", "Docker, Docker Compose", "Three API replicas and local stack"),
            ("Orchestration", "Kubernetes 1.37 on kind", "Deployments, StatefulSet, HPA, PDB"),
            ("Configuration", "Kustomize", "Base, local and cloud overlays"),
            ("Unit tests", "Jest, Supertest", "33 unit tests"),
            ("Integration tests", "Jest, Supertest, mongodb-memory-server", "51 integration tests"),
            ("API tests", "Postman, Newman", "20 requests, 49 assertions"),
            ("Monitoring", "Prometheus, Grafana", "Two provisioned dashboards"),
            ("Cloud", "Terraform, AWS", "VPC, EKS, ECR, IRSA, Helm releases"),
            ("CI/CD", "GitHub Actions", "Test, validate, build, scan, deploy"),
        ],
        widths=[3.2, 6.4, 6.8],
    )

    # 6 Implementation.
    doc.add_heading("6. Implementation", level=1)
    doc.add_heading("6.1 Stateless API and GridFS", level=2)
    para(
        doc,
        "The API stores metadata in the videos collection and bytes in the GridFS bucket called media. "
        "The storage driver exposes four operations: putFile, stat, createReadStream and delete. "
        "Because the bucket lives in MongoDB, the API deployment can run three or twelve replicas "
        "without a ReadWriteMany volume.",
    )
    para(
        doc,
        "The Mongo connection retries every three seconds and the readiness probe stays red until the "
        "database is reachable. A pod that cannot reach MongoDB never receives traffic. Graceful "
        "shutdown closes the HTTP server, waits for in flight streams and disconnects from Mongo.",
    )
    doc.add_heading("6.2 Range streaming", level=2)
    para(
        doc,
        "The range parser accepts a single byte range, an open ended range and a suffix range. It "
        "clamps the end to the object size, rejects multiple ranges, and returns 416 with a "
        "Content-Range of the form bytes */size when the request cannot be satisfied. The GridFS read "
        "stream receives an exclusive end offset, so the driver adds one to the inclusive HTTP end.",
    )
    para(
        doc,
        "The stream response sets Accept-Ranges, Content-Type, Content-Length, Content-Range, "
        "Cache-Control and Content-Disposition. Views are incremented once per stream, not once per "
        "chunk. The zero byte case was added after a test showed that an empty file should return 200 "
        "with Content-Length 0 rather than 416.",
    )
    figure(doc, SHOTS / "03-range-request.png", "A real 206 response through NGINX", max_height=17)

    doc.add_heading("6.3 NGINX edge", level=2)
    para(
        doc,
        "NGINX resolves the headless service every five seconds. Upload rate limiting is applied with "
        "a map that gives GET and HEAD an empty key, so playback is never rate limited while POST "
        "requests are. This replaced an initial limit_except block that nginx rejected because "
        "limit_req is not allowed in that context.",
    )
    para(
        doc,
        "The proxy forwards X-Request-Id, Range and If-Range, disables buffering, sets a 300 second "
        "read timeout and adds X-Upstream-Addr to every response. During the smoke test, twelve "
        "requests were spread across all three API pods.",
    )

    doc.add_heading("6.4 Docker", level=2)
    para(
        doc,
        "The image is built in two stages. The dependencies stage runs npm ci --omit=dev. The runtime "
        "stage uses node:22-alpine, adds tini as PID 1, creates the upload directory, switches to the "
        "node user and declares a healthcheck against /healthz. The final image contains no build "
        "tools and runs as a non-root user.",
    )
    figure(doc, SHOTS / "02-compose-ps.png", "Docker Compose stack: MongoDB, three API replicas and NGINX", max_height=12)

    doc.add_heading("6.5 Kubernetes objects", level=2)
    para(
        doc,
        "The base namespace contains a Mongo StatefulSet with a 5 GiB local-path volume, a Job that "
        "creates a least-privilege application user, an API Deployment, two Services, an NGINX "
        "Deployment, two HPAs, two PodDisruptionBudgets and five NetworkPolicies.",
    )
    bullets(
        doc,
        [
            ("API Deployment. ", "3 replicas, maxUnavailable 0, topology spread across nodes, non-root, read-only root filesystem, all capabilities dropped and seccomp RuntimeDefault."),
            ("Probes. ", "startup and liveness use /healthz, readiness uses /readyz, which checks MongoDB and GridFS."),
            ("PDB. ", "at least two API pods and one NGINX pod stay available during a drain."),
            ("NetworkPolicy. ", "default deny, then explicit DNS, Mongo and NGINX rules."),
            ("HPA. ", "CPU target 60 percent, minimum 3, maximum 12, scale up by two pods or 100 percent per 30 seconds."),
        ],
    )
    figure(doc, SHOTS / "04-k8s-pods.png", "API pods spread across two worker nodes", max_height=11)
    figure(doc, SHOTS / "05-k8s-objects.png", "Deployments, Services, HPAs and PDBs after deployment", max_height=15)

    doc.add_heading("6.6 Autoscaling", level=2)
    para(
        doc,
        "The API requests 100 millicores and is limited to 500 millicores. At a 60 percent target the "
        "HPA aims for about 60 millicores per pod. Under the 120 connection load test the CPU target "
        "was crossed within 30 seconds, the HPA added three pods, then six more, and stopped at the "
        "maximum of twelve. NGINX scaled from two to six pods with its own HPA.",
    )
    figure(doc, SHOTS / "11-hpa-scaleup.png", "HPA watch from three to twelve API replicas", max_height=19)
    para(
        doc,
        "The scale down window is 60 seconds and removes at most half the pods per minute. After the "
        "load stopped, the deployment returned to three API pods and two NGINX pods without manual "
        "intervention.",
    )

    doc.add_heading("6.7 Security and reliability", level=2)
    bullets(
        doc,
        [
            "All pods run as non-root with a read-only root filesystem where possible, dropped capabilities and the RuntimeDefault seccomp profile.",
            "The application service account has automountServiceAccountToken set to false.",
            "Secrets are generated into the cluster by Kustomize and never baked into the image.",
            "The Express trust proxy setting is exactly one hop, so X-Forwarded-For cannot be spoofed to bypass the upload rate limiter.",
            "The API hides the GridFS storage key from every JSON response.",
            "Uploads are validated by MIME type, size and Zod schemas, and temporary files are removed on failure.",
            "The image is scanned by Trivy in CI and published to GHCR only from main.",
        ],
    )

    # 7 Testing.
    doc.add_heading("7. Testing: unit, integration, coverage and Postman", level=1)
    doc.add_heading("7.1 Strategy", level=2)
    para(
        doc,
        "We used four layers. Unit tests check pure functions and middleware without a database. "
        "Integration tests start the real Express app against an in-memory MongoDB and exercise the "
        "real GridFS driver. Postman and Newman check the deployed API through NGINX. The smoke script "
        "checks the same path from a shell, including the exact bytes returned for a range.",
    )
    table(
        doc,
        ["Layer", "Tool", "Scope", "Result"],
        [
            ("Unit", "Jest", "Range parser, validation, errors, context, model", "33 passed"),
            ("Integration", "Jest, Supertest, memory MongoDB", "Real routes, GridFS, ranges, uploads", "51 passed"),
            ("Coverage", "Jest coverage", "Statements, branches, functions, lines", "90.45% lines"),
            ("API contract", "Postman, Newman", "Deployed API through NGINX", "20 requests, 49 assertions, 0 failed"),
            ("Smoke", "Bash, curl", "Upload, 206 range, load balancing", "Passed"),
        ],
        widths=[3.0, 4.6, 6.8, 4.0],
    )

    doc.add_heading("7.2 Unit tests", level=2)
    para(
        doc,
        "The unit suite covers eleven range parser cases, seven validation cases, error handler "
        "branches, request context, and the Mongoose model. It runs in about a third of a second.",
    )
    figure(doc, SHOTS / "06-unit-tests.png", "Unit suite: 33 tests in 5 suites", max_height=17)

    doc.add_heading("7.3 Integration tests", level=2)
    para(
        doc,
        "The integration suite uses mongodb-memory-server and the real storage driver. It covers "
        "upload, list, pagination, search, metadata, full streams, byte ranges, suffix ranges, invalid "
        "ranges, downloads, unicode filenames, empty files, oversized uploads, health failures, "
        "metrics, stats and cleanup. Every response is checked byte for byte where it matters.",
    )
    figure(doc, SHOTS / "07-integration-tests.png", "Integration suite: 51 tests in 4 suites", max_height=19)

    doc.add_heading("7.4 Coverage", level=2)
    para(
        doc,
        "The combined suite reaches 90.45 percent line coverage and 89.18 percent statement coverage "
        "across 84 tests. The uncovered lines are mostly the Mongo retry loop and rare error branches.",
    )
    figure(doc, SHOTS / "08-coverage.png", "Coverage table from npm run test:coverage", max_height=18)

    doc.add_heading("7.5 Postman and Newman", level=2)
    para(
        doc,
        "The Postman collection is the contract test for the running platform. It uploads a real "
        "sample, stores the returned id in a collection variable, and reuses that id for metadata, "
        "full streaming, byte ranges, suffix ranges, invalid ranges, downloads, stats and cleanup. The "
        "environment only holds the base URL, so the runtime id is never shadowed.",
    )
    para(
        doc,
        "Newman ran the collection against the kind NodePort. It executed 20 requests and 49 "
        "assertions with zero failures and received about 6.6 MB of data in 488 ms.",
    )
    figure(doc, SHOTS / "09-newman.png", "Postman collection executed by Newman", max_height=18)

    # 8 Compose.
    doc.add_heading("8. Running the platform with Docker Compose", level=1)
    para(
        doc,
        "Before Kubernetes we built the same topology with Compose: one MongoDB container, three API "
        "containers behind an NGINX container. The stack started cleanly, all five containers were "
        "healthy, and the same range and load balancing checks passed on port 8080.",
    )
    para(
        doc,
        "Compose is useful for fast feedback. Kubernetes is used for the deployment features that "
        "Compose does not provide: probes, rolling updates, autoscaling, disruption budgets and "
        "network policies.",
    )

    # 9 Kubernetes.
    doc.add_heading("9. Deploying to Kubernetes", level=1)
    para(
        doc,
        "The Kubernetes demo runs on a kind cluster with one control plane and two workers. The "
        "cluster includes metrics-server for the HPA and local-path-provisioner for the Mongo volume. "
        "The deployment script builds the image, loads it into kind, creates the secret, applies the "
        "local overlay, waits for Mongo, waits for the application user Job and waits for both "
        "Deployments.",
    )
    para(
        doc,
        "The smoke test then uploads a 3.1 MB video through NGINX, requests the first 64 KiB with a "
        "Range header, checks the 206 response and the exact byte count, and verifies that twelve "
        "health requests are distributed across all three API pods.",
    )
    figure(doc, SHOTS / "10-smoke-k8s.png", "Kubernetes smoke test through the NGINX NodePort", max_height=19)
    figure(doc, SHOTS / "01-ui-kubernetes.png", "The StreamVault UI running on the kind cluster", max_height=18)

    # 10 Load.
    doc.add_heading("10. Autoscaling and load results", level=1)
    para(
        doc,
        "The load test used autocannon with 120 connections for 180 seconds, issuing 256 KiB range "
        "requests against the seeded video. The HPA was watched in a second terminal. The run "
        "completed with 67,861 requests and 17.9 GB read, at an average of 421.5 requests per second. "
        "There were zero errors, zero non 2xx responses and zero timeouts. The p99 latency was 696 ms "
        "and the average was 320 ms.",
    )
    table(
        doc,
        ["Metric", "Result"],
        [
            ("Requests", "67,861"),
            ("Data read", "17.9 GB"),
            ("Requests per second", "421.5 average, 483 peak"),
            ("Latency p50 / p99", "304 ms / 696 ms"),
            ("Errors / timeouts / non 2xx", "0 / 0 / 0"),
            ("API replicas before / peak / after", "3 / 12 / 3"),
            ("NGINX replicas before / peak / after", "2 / 6 / 2"),
        ],
        widths=[7.0, 9.4],
    )
    figure(doc, SHOTS / "12-load-test.png", "Autocannon summary from the 180 second run", max_height=18)
    figure(doc, SHOTS / "13-top-pods.png", "CPU and memory for the twelve API pods at peak", max_height=19)
    figure(doc, SHOTS / "11-hpa-scaleup.png", "HPA event log during scale up", max_height=19)

    # 11 Observability.
    doc.add_heading("11. Observability with Prometheus and Grafana", level=1)
    para(
        doc,
        "The API exposes request histograms, upload counters, stream counters, a bytes streamed "
        "counter, an active streams gauge, storage error counters and the default Node.js process "
        "metrics. A local Prometheus stack scrapes the kind NodePort every five seconds. Grafana is "
        "provisioned with two dashboards, so there is no manual import step.",
    )
    para(
        doc,
        "The application dashboard shows requests per second, p99 latency, the 5xx ratio, active "
        "streams, request rate by route, p95 and p99 latency, active streams, throughput and uploads. "
        "The runtime dashboard shows resident memory, V8 heap, event loop lag, CPU, handles, CPU "
        "seconds, garbage collection pause and handle counts. The alert rules cover high error rate, "
        "high p99 latency, HPA at its ceiling and repeated pod restarts.",
    )
    figure(doc, SHOTS / "14-grafana-app.png", "Grafana application dashboard with live traffic", max_height=17)
    figure(doc, SHOTS / "15-grafana-runtime.png", "Grafana Node.js runtime dashboard", max_height=17)

    # 12 Terraform.
    doc.add_heading("12. Cloud infrastructure with Terraform", level=1)
    para(
        doc,
        "The Terraform stack provisions the AWS equivalent of the lab. It creates a VPC with three "
        "public and three private subnets and one NAT gateway per availability zone, an EKS 1.31 "
        "cluster with IRSA enabled, a managed node group of three to six t3.large nodes, an ECR "
        "repository with image scanning and a fifteen image lifecycle policy, and IRSA roles for the "
        "AWS Load Balancer Controller and the cluster autoscaler.",
    )
    para(
        doc,
        "Helm releases install the AWS Load Balancer Controller, metrics-server and the cluster "
        "autoscaler. The node group is tagged for autoscaler discovery. The configuration is format "
        "checked, initialized without a backend and validated in CI, so the pipeline needs no AWS "
        "credentials.",
    )
    figure(doc, SHOTS / "16-terraform-validate.png", "terraform fmt and terraform validate", max_height=15)

    # 13 CI.
    doc.add_heading("13. CI/CD pipeline", level=1)
    para(
        doc,
        "The GitHub Actions pipeline runs five jobs. The first runs ESLint and all 84 tests with "
        "coverage. The second renders both Kustomize overlays plus the observability stack and "
        "validates them with kubeconform. The third runs Terraform format, init and validate. The "
        "fourth builds the image, scans it with Trivy and pushes it to GHCR on main. The fifth creates "
        "a kind cluster, deploys the stack, runs the shell smoke test and then runs the Postman "
        "collection with Newman.",
    )
    para(
        doc,
        "The pipeline caught a real repository bug. The .gitignore rule storage/ was also matching "
        "src/storage, so a clean checkout did not contain the GridFS driver even though the local "
        "working tree did. The unit tests in CI failed with a module not found error. Scoping the rule "
        "to /storage/ fixed it. This was the clearest lesson of the project: local success is not the "
        "same as a reproducible build.",
    )
    if (SHOTS / "18-ci.png").exists():
        figure(doc, SHOTS / "18-ci.png", "GitHub Actions run with all jobs green", max_height=18)
    para(
        doc,
        "The pipeline went red five times before the sixth run turned green, and each failure led to "
        "a real fix. The first two runs hit the storage ignore rule. After that the Trivy action tag "
        "needed its v prefix, the GHCR image name had to be lowercased from GITHUB_REPOSITORY, and "
        "the hosted runner had no ffmpeg to generate the sample video for the end to end job. The git "
        "history keeps those fixes as separate small commits.",
    )
    figure(doc, SHOTS / "17-git-log.png", "Git history from the first commit to the green pipeline", max_height=18)

    # 14 Problems.
    doc.add_heading("14. Problems found and fixed", level=1)
    table(
        doc,
        ["Problem", "Cause", "Fix"],
        [
            (
                "Production image could not load the GridFS driver",
                "mongodb was only a transitive dependency of mongoose and was missing from the production install",
                "Declared mongodb as a direct dependency and removed the unused S3 SDK",
            ),
            (
                "NGINX crashed on startup",
                "limit_req is not allowed inside limit_except",
                "Rate limit keyed by a map that is empty for GET and HEAD",
            ),
            (
                "mongo-init Job timed out",
                "The default deny NetworkPolicy had no egress rule for the Job",
                "Added an explicit egress policy from mongo-init to mongo on 27017",
            ),
            (
                "Unicode upload filenames were double encoded",
                "Busboy decodes multipart filenames as latin1",
                "Normalized the filename to UTF-8 in the upload middleware",
            ),
            (
                "Upload rate limit could be bypassed",
                "trust proxy was set to true, so any client could spoof X-Forwarded-For",
                "Set trust proxy to exactly one hop and added a regression test",
            ),
            (
                "Clean checkout had no src/storage",
                "The storage/ ignore rule matched every directory named storage",
                "Changed the rule to /storage/ and let CI prove the fix",
            ),
            (
                "Empty video returned 416",
                "The range parser treated a zero byte object as unsatisfiable even without a Range header",
                "Return 200 with Content-Length 0 for a full read and 416 only for an actual range",
            ),
            (
                "Image push to GHCR failed",
                "GHCR rejects repository names with capital letters and the GitHub owner is VedarthamSaaket",
                "Computed a lowercase image name from GITHUB_REPOSITORY in bash",
            ),
            (
                "Image scan job could not start",
                "The Trivy action tag was written without the v prefix",
                "Pinned aquasecurity/trivy-action to v0.36.0",
            ),
            (
                "End to end job failed before deploying",
                "The GitHub hosted runner does not ship ffmpeg, so the sample video could not be generated",
                "Installed ffmpeg as the first step of the e2e job",
            ),
        ],
        widths=[4.8, 6.4, 6.2],
        font_size=9,
    )

    # 15 Learnings.
    doc.add_heading("15. What we learnt", level=1)
    learnings = [
        (
            "Orchestration is more than running containers. ",
            "A Deployment that starts is not the same as a Deployment that is ready. Probes, resource requests, graceful shutdown and disruption budgets decide whether a rollout is safe.",
        ),
        (
            "Readiness is a contract. ",
            "The readiness probe checks MongoDB and GridFS. A pod that cannot store or read a video should not receive traffic, even if the Node process is healthy.",
        ),
        (
            "Autoscaling needs a measurable request. ",
            "The HPA can only scale on a resource the pods request. Setting a 100 millicore request made the 60 percent target meaningful and the scale up repeatable.",
        ),
        (
            "Load balancing is a path, not a component. ",
            "We had to preserve Range headers across NGINX, disable buffering and use a headless service so the proxy could see pod IPs. A load balancer that breaks range requests is worse than no load balancer.",
        ),
        (
            "Tests protect the deployment. ",
            "Unit tests found the zero byte and unicode filename problems. Integration tests proved the GridFS ranges byte for byte. Postman proved the deployed path through NGINX.",
        ),
        (
            "CI catches what local state hides. ",
            "The src/storage ignore bug only appeared in a clean checkout. The pipeline is the only place that proved the repository, not just the laptop, was complete.",
        ),
        (
            "Observability shortens debugging. ",
            "Request rate, p99 latency, active streams and event loop lag showed immediately whether a slowdown came from traffic, MongoDB or the Node process.",
        ),
        (
            "Infrastructure as code makes cloud reviewable. ",
            "Terraform turned the VPC, EKS, IAM and Helm setup into a diff that can be reviewed and validated before anyone spends money.",
        ),
    ]
    for lead, rest in learnings:
        para(doc, rest, bold_lead=lead)

    para(
        doc,
        "Before this course we treated a project as finished when it ran on one machine. The most "
        "useful change was learning to ask a different question: can someone else clone this, deploy "
        "it, break it and observe it without asking us? Every part of StreamVault is an attempt to "
        "make that answer yes.",
    )

    # 16 Future.
    doc.add_heading("16. Future scope", level=1)
    bullets(
        doc,
        [
            ("Managed MongoDB. ", "Move from a single StatefulSet pod to a managed replica set or Atlas so the metadata and GridFS buckets survive node loss."),
            ("Object storage and CDN. ", "Move media from GridFS to S3 compatible storage and put a CDN in front of playback for global scale."),
            ("Transcoding workers. ", "Add a queue and separate worker Deployment for HLS renditions, with KEDA scaling on queue depth."),
            ("GitOps and progressive delivery. ", "Use Argo CD or Flux for the cluster state and canary or blue green rollouts for the API."),
            ("Custom metrics. ", "Scale on concurrent streams per pod instead of CPU once the workload becomes network bound."),
            ("Security hardening. ", "Add TLS with cert-manager, an external secrets operator, image signing and a Web Application Firewall."),
            ("Cost controls. ", "Add AWS budget alerts, cluster autoscaler limits and a scheduled scale down for the lab environment."),
        ],
    )

    # 17 Conclusion.
    doc.add_heading("17. Conclusion", level=1)
    para(
        doc,
        "StreamVault is a complete DevOps demo rather than a slide deck. The application is small "
        "enough to understand and real enough to fail in useful ways. It runs locally with Compose, "
        "deploys to a three node kind cluster, scales from three to twelve API pods under load, keeps "
        "serving video with correct range semantics, and exposes the evidence through Prometheus and "
        "Grafana.",
    )
    para(
        doc,
        "The project produced 84 passing tests, 20 Postman requests with 49 assertions, 67,861 load "
        "test requests with zero errors, a green five job CI pipeline, a validated Terraform stack and "
        "a reproducible set of screenshots. More importantly, it changed how we think about finishing "
        "a project: not when the code runs, but when another person can deploy it, test it and see "
        "what it is doing.",
    )

    # Appendix A.
    doc.add_heading("Appendix A. Command reference", level=1)
    commands = [
        ("Install and test. ", "npm ci; npm run lint; npm test; npm run test:coverage"),
        ("Unit tests only. ", "npx jest tests/unit --runInBand"),
        ("Integration tests only. ", "npx jest tests/integration --runInBand"),
        ("Postman. ", "bash scripts/generate-sample.sh; npm run test:api"),
        ("Compose. ", "docker compose up --build -d --scale app=3; docker compose ps"),
        ("kind cluster. ", "make kind-up"),
        ("Deploy. ", "make deploy"),
        ("Smoke. ", "make smoke"),
        ("Load test. ", "make load"),
        ("Autoscaling demo. ", "make hpa"),
        ("Grafana. ", "docker compose -f observability/docker-compose.yml up -d"),
        ("Terraform. ", "cd terraform; terraform init; terraform validate"),
        ("CI. ", "gh run list; gh run watch"),
    ]
    for lead, rest in commands:
        para(doc, rest, bold_lead=lead, size=10.5)

    # Appendix B.
    doc.add_heading("Appendix B. Evidence index", level=1)
    para(
        doc,
        "Every figure in this report is a real capture from this build. The images are kept in the "
        "repository under docs/screenshots and docs/diagrams, and every terminal image includes the "
        "command that produced it.",
    )
    table(
        doc,
        ["Figure", "Evidence", "File"],
        FIG["list"],
        widths=[2.0, 9.4, 6.0],
        font_size=9,
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
