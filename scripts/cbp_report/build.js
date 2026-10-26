const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, BorderStyle, ShadingType, PageBreak, Footer, PageNumber, LevelFormat,
  TabStopType, VerticalAlign,
} = require("docx");

const S = __dirname;
const SHOTS = process.argv[4];
const OUT = process.argv[2];
const PAGES = JSON.parse(process.argv[3] || "{}");

const FONT = "Times New Roman";
const TITLE = "Container Orchestration, Load Balancing and Autoscaling of a Video Streaming Platform Using Docker, NGINX and Kubernetes";
const DEPT = "CSE – AIML, IoT and R&AI";
const GUIDE = "Mr. Bhupesh Deka";
const TEAM = [
  ["23071A6908", "Ch. Nandini"],
  ["23071A6909", "Thanvika Devi"],
  ["23071A6961", "T. Nayana"],
  ["23071A6963", "V. Saaket"],
  ["23071A6964", "V. Aashritha"],
];

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const THIN = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

function runs(text, base = {}) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean);
  return parts.map((p) => p.startsWith("**")
    ? new TextRun({ text: p.slice(2, -2), bold: true, font: FONT, ...base })
    : p.startsWith("*") && p.endsWith("*") && p.length > 2
      ? new TextRun({ text: p.slice(1, -1), italics: true, font: FONT, ...base })
      : new TextRun({ text: p, font: FONT, ...base }));
}

const center = (text, opts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: opts.after ?? 0, before: opts.before ?? 0 },
  children: runs(text, { size: opts.size ?? 24, bold: opts.bold, underline: opts.underline ? {} : undefined }),
});

const blank = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [] }));

const body = (text) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 360, lineRule: "auto", after: 160 },
  children: runs(text, { size: 24 }),
});

const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 360, lineRule: "auto", after: 80 },
  children: runs(text, { size: 24 }),
});

const chapter = (text) => [new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 280 },
  children: [new PageBreak(), new TextRun({ text, bold: true, size: 32, font: FONT })],
})];

const h2 = (text) => new Paragraph({
  spacing: { before: 240, after: 120 },
  keepNext: true,
  children: [new TextRun({ text, bold: true, size: 28, font: FONT })],
});

const h3 = (text) => new Paragraph({
  spacing: { before: 200, after: 100 },
  keepNext: true,
  children: [new TextRun({ text, bold: true, size: 24, font: FONT })],
});

function code(lines) {
  return lines.split("\n").map((l, i, a) => new Paragraph({
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" },
    spacing: { line: 240, before: i === 0 ? 80 : 0, after: i === a.length - 1 ? 200 : 0 },
    indent: { left: 240, right: 240 },
    keepLines: true,
    children: [new TextRun({ text: l.length ? l : " ", font: "Courier New", size: 18 })],
  }));
}

function image(file, widthPx, caption) {
  const data = fs.readFileSync(file);
  const isPng = file.endsWith(".png");
  const dims = require("child_process").execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]).toString();
  const w = Number(dims.match(/pixelWidth: (\d+)/)[1]);
  const h = Number(dims.match(/pixelHeight: (\d+)/)[1]);
  const width = Math.min(widthPx, 600);
  const height = Math.round(width * h / w);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      keepNext: true,
      children: [new ImageRun({ type: isPng ? "png" : "jpg", data, transformation: { width, height } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: caption, italics: true, size: 20, font: FONT })],
    }),
  ];
}

function header() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type: "jpg", data: fs.readFileSync(path.join(S, "vnr-logo.jpeg")), transformation: { width: 115, height: 102 } })],
    }),
    center("VNR Vignana Jyothi Institute of Engineering and Technology", { bold: true, before: 80 }),
    center("(Affiliated to J.N.T.U, Hyderabad)"),
    center("Bachupally(v), Hyderabad, Telangana, India.", { bold: true }),
  ];
}

function cell(children, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: opts.borders ?? { top: NONE, bottom: NONE, left: NONE, right: NONE },
    shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children,
  });
}

const p = (text, opts = {}) => new Paragraph({
  alignment: opts.align ?? AlignmentType.LEFT,
  spacing: { after: 0 },
  children: runs(text, { size: opts.size ?? 24, bold: opts.bold }),
});

function cover() {
  return [
    ...header(),
    ...blank(1),
    center(TITLE, { bold: true, after: 60 }),
    center("DEVOPS COURSE BASED PROJECT", { bold: true }),
    ...blank(1),
    center("A course project submitted in complete requirements for the award of the degree of"),
    ...blank(1),
    center("BACHELOR OF TECHNOLOGY", { bold: true }),
    ...blank(1),
    center("IN"),
    ...blank(1),
    center("COMPUTER SCIENCE AND ENGINEERING – (IOT)", { bold: true }),
    ...blank(1),
    center("Submitted by"),
    ...blank(1),
    ...TEAM.map(([r, n]) => center(`${r} – ${n}`, { bold: true })),
    ...blank(2),
    center("Under the guidance of"),
    center(GUIDE, { bold: true }),
    center("Assistant Professor", { bold: true }),
    center(`Dept. of Computer Science and Engineering – (AIML, IoT and R&AI)`, { bold: true }),
  ];
}

function certificate() {
  const names = TEAM.map(([r, n]) => `**${n} (${r})**`);
  const list = names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  return [
    new Paragraph({ children: [new PageBreak()] }),
    ...header(),
    ...blank(2),
    center("CERTIFICATE", { bold: true, size: 28, underline: true, after: 360 }),
    body(`This is to certify that ${list} have completed their course project work at ${DEPT} Department of VNR VJIET, Hyderabad entitled **“${TITLE}”** in complete fulfilment of the requirements for the award of B. Tech degree during the academic year 2026-2027. This work is carried out under my supervision and has not been submitted to any other University/Institute for award of any degree/diploma.`),
    ...blank(4),
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [4513, 4513],
      borders: NO_BORDERS,
      rows: [new TableRow({ children: [
        cell([p(GUIDE, { bold: true }), p("Assistant Professor"), p(`${DEPT} Department`), p("VNR VJIET", { bold: true })], 4513),
        cell([p("Dr. Y. Sagar", { bold: true }), p("Professor and Head"), p(`${DEPT} Department`), p("VNR VJIET", { bold: true })], 4513),
      ] })],
    }),
  ];
}

function declaration() {
  const w = Math.floor(9026 / 5);
  return [
    ...chapter("DECLARATION"),
    ...blank(1),
    body(`This is to certify that our project report titled **“${TITLE}”** submitted to Vallurupalli Nageswara Rao Vignana Jyothi Institute of Engineering and Technology in complete fulfilment of requirement for the award of Bachelor of Technology in CSE – IoT is a bonafide report of the work carried out by us under the guidance and supervision of **${GUIDE}**, Assistant Professor, Department of ${DEPT}, Vallurupalli Nageswara Rao Vignana Jyothi Institute of Engineering and Technology. To the best of our knowledge, this has not been submitted in any form to other university or institution for the award of any degree or diploma.`),
    ...blank(3),
    new Table({
      width: { size: w * 5, type: WidthType.DXA },
      columnWidths: Array(5).fill(w),
      borders: NO_BORDERS,
      rows: [new TableRow({ children: TEAM.map(([r, n]) => cell([
        p(n, { bold: true, align: AlignmentType.CENTER, size: 22 }),
        p(r, { bold: true, align: AlignmentType.CENTER, size: 22 }),
        p("IV CSE-IoT", { align: AlignmentType.CENTER, size: 22 }),
      ], w)) })],
    }),
  ];
}

function tableReq(rows, widths) {
  const b = { top: THIN, bottom: THIN, left: THIN, right: THIN };
  return new Table({
    width: { size: widths.reduce((a, c) => a + c, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, ri) => new TableRow({ children: r.map((t, i) => cell([p(t, { bold: ri === 0, size: 22 })], widths[i], { borders: b, fill: ri === 0 ? "E7E6E6" : undefined })) })),
  });
}

const shot = (name) => path.join(SHOTS, name);
let fig = { ch: 0, n: 0 };
const figure = (name, width, caption) => {
  fig.n += 1;
  return image(shot(name), width, `Fig ${fig.ch}.${fig.n}: ${caption}`);
};
const startFigs = (ch) => { fig = { ch, n: 0 }; };

function acknowledgement() {
  return [
    ...chapter("ACKNOWLEDGEMENT"),
    body("Over the past three years, VNRVJIET has helped us grow from beginners in Computer Science into engineers who can build, deploy and operate working software. We are thankful to the institute for everything it has given us. We would like to express our gratitude to the principal of our institute, Dr. Challa Dhanunjaya Naidu, and the Head of the CSE – AIML, IoT and R&AI Department, Dr. Y. Sagar, for their support and encouragement, which helped us complete this project on time."),
    body(`We are grateful to our project guide, ${GUIDE}, for teaching us the DevOps concepts this project is built on and for his guidance and feedback throughout the work. His suggestions helped us keep the project focused on containers, orchestration, load balancing and measurable scalability.`),
    body("We also thank our parents and friends for their constant support, and every member of our team for sharing the work of building the API, writing the tests, setting up the cluster and running the load experiments."),
  ];
}

function abstract() {
  return [
    ...chapter("ABSTRACT"),
    body("Video platforms have two very different kinds of traffic. Uploads are large sequential writes, and playback is a stream of many small byte range reads that can spike without warning. A single server with a local disk can serve a demo, but it cannot scale, because the moment a second server is added the question becomes where the video lives and which server owns it."),
    body("This project builds StreamVault, a video streaming platform designed to be scaled. The API is written in Node.js with Express and stores both metadata and video bytes in MongoDB GridFS, so every API instance is stateless and any replica can serve any video. NGINX sits at the edge as the load balancer, forwards HTTP Range headers unchanged and spreads requests over every ready pod. The whole stack is containerised with a two stage Docker image and deployed to a three node Kubernetes cluster created with kind, where a HorizontalPodAutoscaler grows the API from 3 to 12 replicas when CPU passes 60 percent."),
    body("The project also includes 84 automated Jest tests with 90.45% line coverage, a Postman collection of 20 requests and 49 assertions run by Newman, Prometheus metrics with two Grafana dashboards, a Terraform stack for AWS EKS and a five job GitHub Actions pipeline that tests, validates, scans, builds and deploys the system to a fresh cluster on every push."),
    body("In a 180 second load test the platform served 67,861 range requests and 17.9 GB of video at 421.5 requests per second with a p99 latency of 696 ms and zero errors, while Kubernetes scaled the API from 3 to 12 pods and NGINX from 2 to 6 pods, then back down after the load ended."),
  ];
}

function index() {
  const rows = [
    ["1", "Introduction", "intro"],
    ["2", "Literature Survey", "lit"],
    ["3", "Requirements", "req"],
    ["4", "Implementation", "impl"],
    ["5", "Results", "res"],
    ["6", "Conclusion", "conc"],
    ["7", "References", "refs"],
  ];
  const widths = [1300, 5926, 1800];
  const hdr = ["S. No.", "Contents", "Page No."];
  const b = { top: THIN, bottom: THIN, left: THIN, right: THIN };
  return [
    ...chapter("INDEX"),
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({ children: hdr.map((t, i) => cell([p(t, { bold: true, align: AlignmentType.CENTER })], widths[i], { borders: b, fill: "E7E6E6" })) }),
        ...rows.map(([n, t, k]) => new TableRow({ children: [
          cell([p(n, { align: AlignmentType.CENTER })], widths[0], { borders: b }),
          cell([p(t)], widths[1], { borders: b }),
          cell([p(String(PAGES[k] ?? "–"), { align: AlignmentType.CENTER })], widths[2], { borders: b }),
        ] })),
      ],
    }),
  ];
}

function introduction() {
  return [
    ...chapter("INTRODUCTION"),
    body("Most student projects end the moment the code runs on one laptop. A real service has to keep working when many people use it at once, when one machine fails and when traffic suddenly doubles. That is the problem container orchestration, load balancing and autoscaling solve, and it is the focus of this project."),
    body("We chose video streaming because it makes these problems easy to see. A video is large, it is read in pieces, and a viewer notices immediately when playback stalls. If the platform cannot share load across servers, or loses track of where a video is stored, the failure is visible on screen."),
    h3("1.1 Containerisation"),
    body("A container packages an application with everything it needs to run, so it behaves the same on a laptop, a CI runner and a cloud server. StreamVault is built into one small Docker image that runs as a non-root user with a health check, and the same image is used by Docker Compose, by the kind cluster and by the AWS deployment described in Terraform."),
    h3("1.2 Load Balancing"),
    body("A load balancer gives clients one address and spreads their requests across many servers. In StreamVault, NGINX is the single entry point. It finds every ready API pod through a Kubernetes headless service and forwards each request, including the HTTP Range header a video player sends, to one of them."),
    h3("1.3 Orchestration and Autoscaling"),
    body("An orchestrator keeps the desired number of containers running, restarts failed ones, only sends traffic to healthy ones and can change the number of replicas while the system is live. Kubernetes does this for StreamVault, and its HorizontalPodAutoscaler adds API pods when CPU usage rises and removes them when it falls."),
    h3("1.4 Objectives"),
    bullet("Build a stateless video streaming API in Node.js that stores video bytes in MongoDB GridFS and supports HTTP range requests."),
    bullet("Package the system with Docker and run MongoDB, three API replicas and NGINX together with Docker Compose."),
    bullet("Put NGINX in front of the API as a load balancer that keeps range requests and streaming working."),
    bullet("Deploy the platform to a multi node Kubernetes cluster with probes, resource limits, disruption budgets and network policies."),
    bullet("Autoscale the API from 3 to 12 pods on CPU and prove it with a real load test."),
    bullet("Test the system at every level, observe it with Prometheus and Grafana, describe the cloud version with Terraform and automate everything with GitHub Actions."),
  ];
}

function literature() {
  return [
    ...chapter("LITERATURE SURVEY"),
    body("This chapter covers the ideas and tools StreamVault is built on: containers, cluster orchestration, load balancing and HTTP range requests, autoscaling, and the DevOps practices used to test and deliver the system."),
    h3("2.1 Containers"),
    body("Docker popularised Linux containers as a way to ship an application together with its dependencies and run it consistently across environments [1]. Containers start in seconds and share the host kernel, which makes it practical to run many replicas of the same service. Multi stage builds keep the final image small by leaving compilers and development dependencies behind [2]."),
    h3("2.2 Cluster Orchestration and Kubernetes"),
    body("Google's Borg system showed that a central cluster manager can run very large numbers of jobs by placing containers on machines, restarting failures and packing work efficiently [3]. Kubernetes grew out of this experience and exposes the same ideas as declarative objects such as Deployments, Services and StatefulSets [4], [5]. A Deployment keeps a number of identical pods running, a Service gives them a stable name, and readiness probes decide which pods receive traffic. kind runs a complete Kubernetes cluster inside Docker containers, which makes a multi node cluster possible on a single laptop and inside CI [6]."),
    h3("2.3 Load Balancing and Range Requests"),
    body("NGINX is a widely used reverse proxy and load balancer that distributes requests over a group of upstream servers [7]. Video playback depends on HTTP range requests, in which the client asks for a specific byte range and the server answers 206 Partial Content with a Content-Range header [8]. A proxy that buffers responses or drops the Range header breaks seeking, so the proxy configuration matters as much as the application."),
    h3("2.4 Storage for Stateless Services"),
    body("MongoDB GridFS stores large files by splitting them into chunks inside two collections, which lets any client read any byte range of a file directly from the database [9]. Keeping video bytes in GridFS instead of on a local disk removes state from the API containers, which is what allows Kubernetes to add or remove replicas freely."),
    h3("2.5 Autoscaling"),
    body("The Kubernetes HorizontalPodAutoscaler periodically compares a metric such as average CPU utilisation against a target and changes the replica count of a Deployment to match [10]. CPU utilisation is measured against the CPU request of each pod, so meaningful requests are required, and scale up and scale down policies control how quickly replicas are added and removed. metrics-server supplies the CPU figures [11]."),
    h3("2.6 Observability, Infrastructure as Code and CI/CD"),
    body("Prometheus scrapes numeric metrics from services over HTTP and Grafana turns them into dashboards [12], [13]. Terraform describes cloud infrastructure as code that can be reviewed and validated before it is applied [14]. GitHub Actions runs workflows defined in the repository on every push [15]. Humble and Farley describe the deployment pipeline in which every change passes the same automated stages [16], and the DORA research by Forsgren, Humble and Kim links automated testing and deployment with faster and more reliable delivery [17]."),
    h3("2.7 Related Work"),
    bullet("Verma et al. report that Borg runs hundreds of thousands of jobs across many clusters at Google with high utilisation by treating machines as a shared pool managed by one scheduler [3]."),
    bullet("Burns et al. describe how the lessons of Borg and Omega led to Kubernetes, especially the use of declarative desired state, labels and controllers that keep reconciling the actual state [5]."),
    bullet("Kim et al. describe automated, repeatable deployment and fast feedback as core practices of high performing teams [18]."),
    body("StreamVault applies these ideas at a small scale: one stateless image, a real proxy in front of it, a cluster that keeps it running and an autoscaler that grows it under load, all verified by automated tests."),
  ];
}

function requirements() {
  return [
    ...chapter("REQUIREMENTS"),
    body("This chapter lists the hardware, software, functional and non-functional requirements of the project. The whole system, including the three node Kubernetes cluster, runs on a single laptop."),
    h3("3.1 Hardware Requirements"),
    tableReq([
      ["Component", "Minimum Specification", "Recommended Specification"],
      ["Processor", "4 cores, x86-64 or ARM64", "8 cores or Apple M series"],
      ["RAM", "8 GB", "16 GB"],
      ["Storage", "15 GB free space", "30 GB free space"],
      ["Network", "Internet for the first image pulls", "10 Mbps or faster"],
    ], [2400, 3300, 3326]),
    ...blank(1),
    h3("3.2 Software Requirements"),
    bullet("**Operating System:** macOS, Ubuntu Linux or Windows with WSL 2"),
    bullet("**Runtime:** Node.js 22 with Express, Mongoose 8, Zod, Pino and prom-client"),
    bullet("**Database:** MongoDB 7 with GridFS"),
    bullet("**Containers:** Docker and Docker Compose"),
    bullet("**Load Balancer:** NGINX 1.27"),
    bullet("**Orchestration:** Kubernetes with kind, kubectl, Kustomize and metrics-server"),
    bullet("**Testing:** Jest, Supertest, mongodb-memory-server, Postman and Newman, autocannon"),
    bullet("**Monitoring:** Prometheus and Grafana"),
    bullet("**Cloud and CI/CD:** Terraform for AWS EKS, GitHub Actions, Trivy and GitHub Container Registry"),
    h3("3.3 Functional Requirements"),
    bullet("A user must be able to upload a video, list and search the library, view and edit its details, stream it, download it and delete it."),
    bullet("Streaming must support single, open ended and suffix byte ranges and answer 206 Partial Content, and must reject impossible ranges with 416."),
    bullet("Any API replica must be able to serve any video, so the API must not keep video files on its own disk."),
    bullet("All traffic must enter through one NGINX address that spreads requests over every ready API pod."),
    bullet("The number of API pods must grow automatically under load and shrink again when the load ends."),
    h3("3.4 Non-Functional Requirements"),
    bullet("**Scalability:** The API must scale from 3 to 12 replicas without changes to the code or configuration."),
    bullet("**Availability:** Pods must only receive traffic once MongoDB and GridFS are reachable, and at least two API pods must stay up during node drains."),
    bullet("**Security:** Containers must run as a non-root user, secrets must stay out of the repository and network policies must deny traffic by default."),
    bullet("**Performance:** The platform must sustain hundreds of range requests per second without errors."),
    bullet("**Observability:** Request rate, latency, errors and runtime health must be visible on dashboards."),
    bullet("**Reproducibility:** The full stack must be created, deployed and tested from the repository by scripts and by CI."),
  ];
}

function implementation() {
  startFigs(4);
  return [
    ...chapter("IMPLEMENTATION"),
    h2("Step by Step Implementation:"),
    h3("4.1 System Architecture"),
    body("The request path is deliberately simple, and every layer can be scaled on its own."),
    bullet("**Client Layer:** A browser or curl sends requests, including Range headers for playback, to one address on NodePort 30080."),
    bullet("**Edge Layer (NGINX):** Two NGINX pods resolve the headless API service every five seconds and forward each request to a ready pod, with buffering turned off so streams pass straight through."),
    bullet("**Application Layer (Node.js):** Three to twelve identical API pods validate requests, parse ranges and stream bytes. They keep no video files of their own."),
    bullet("**Data Layer (MongoDB):** A MongoDB StatefulSet stores metadata in the videos collection and video bytes in the GridFS bucket media."),
    ...figure("19-architecture.jpg", 600, "StreamVault deployment architecture"),

    h3("4.2 Project Structure"),
    ...code(`video-streaming-platform/
  src/            Express app, GridFS storage, controllers, middleware
  public/         streaming web interface
  tests/unit/     33 unit tests
  tests/integration/  51 integration tests
  postman/        collection and environment for Newman
  docker/         NGINX and MongoDB init configuration for Compose
  k8s/base/       Mongo StatefulSet, API, NGINX, HPA, PDB, NetworkPolicy
  k8s/overlays/   local (kind) and cloud (EKS) settings
  observability/  Prometheus and Grafana with two dashboards
  terraform/      AWS VPC, EKS, ECR, IRSA and Helm releases
  demo/           live demo of streaming, balancing and scaling
  scripts/        cluster, deploy, seed, smoke, load and HPA scripts
  .github/workflows/ci.yml`),

    h3("4.3 Stateless API with GridFS and Range Streaming"),
    body("Uploads are written to a temporary file by Multer, streamed into GridFS by the storage driver and the temporary file is removed. Metadata is saved in the videos collection. When a player asks for a range, the API parses it, opens a GridFS download stream at that byte offset and answers 206 with Content-Range. Because GridFS lives in MongoDB, no pod owns any video."),
    ...code(`stored = await storage.putFile(req.file.path, key, req.file.mimetype);
const video = await Video.create({ ... });

const range = parseRange(req.headers.range, stat.size);
res.status(206);
res.setHeader('Content-Range', \`bytes \${range.start}-\${range.end}/\${size}\`);
stream = await storage.createReadStream(video.storageKey, range);`),
    ...figure("01-ui.jpg", 600, "The StreamVault web interface served from the kind cluster"),
    ...figure("03-range-206.jpg", 520, "A real 206 Partial Content response through NGINX"),

    h3("4.4 Containerisation with Docker"),
    body("The Dockerfile has two stages. The first installs only production dependencies, and the second copies them into a clean node:22-alpine image, adds tini as PID 1, switches to the non-root node user and defines a health check on /healthz. Docker Compose starts MongoDB, three API replicas and NGINX for local development."),
    ...code(`FROM node:22-alpine AS dependencies
RUN npm ci --omit=dev
FROM node:22-alpine AS runtime
RUN apk add --no-cache tini
USER node
HEALTHCHECK CMD node -e "fetch('http://127.0.0.1:3000/healthz')..."
CMD ["node", "src/server.js"]`),
    ...code(`docker compose up --build -d --scale app=3
docker compose ps`),
    ...figure("02-docker-compose.jpg", 600, "Docker Compose: MongoDB, three API containers and NGINX, all healthy"),

    h3("4.5 Load Balancing with NGINX"),
    body("NGINX resolves the headless service through the cluster DNS every five seconds, so new pods join the rotation as soon as they are ready. The Range and If-Range headers are forwarded unchanged and buffering is disabled in both directions so playback and uploads stream through. Only uploads are rate limited, using a map that gives GET and HEAD requests an empty key."),
    ...code(`resolver kube-dns.kube-system.svc.cluster.local valid=5s ipv6=off;
map $request_method $upload_client_key { default $binary_remote_addr; GET ""; HEAD ""; }
limit_req_zone $upload_client_key zone=uploads:10m rate=10r/s;
location / {
  proxy_set_header Range $http_range;
  proxy_set_header If-Range $http_if_range;
  proxy_buffering off;
  proxy_request_buffering off;
}`),

    h3("4.6 Deployment to Kubernetes"),
    body("A kind cluster with one control plane and two workers is created with metrics-server and the local-path storage provisioner. Kustomize applies the base manifests with a local overlay. The API Deployment requests 100m CPU with a 500m limit, uses startup, readiness and liveness probes, and is protected by a PodDisruptionBudget. NetworkPolicies deny traffic by default and allow only NGINX to API and API to MongoDB."),
    ...code(`make kind-up      # kind cluster, metrics-server, local-path
make deploy       # build image, kind load, kubectl apply -k k8s/overlays/local
make seed         # upload the sample video through NGINX
kubectl -n streamvault get pods -o wide`),
    ...figure("04-kubernetes-pods.jpg", 600, "Three API pods, two NGINX pods and MongoDB spread across two workers"),
    ...figure("05-kubernetes-objects.jpg", 600, "Deployments, Services, HorizontalPodAutoscalers and PodDisruptionBudgets"),

    h3("4.7 Autoscaling"),
    body("The HorizontalPodAutoscaler keeps the API between 3 and 12 replicas and targets 60 percent of the requested CPU. It can double the replicas or add two pods every 30 seconds, and removes at most half of them per minute once load falls. A second autoscaler keeps NGINX between 2 and 6 pods."),
    ...code(`minReplicas: 3
maxReplicas: 12
metrics: cpu averageUtilization 60
scaleUp:   100% or 2 pods every 30s
scaleDown: 50% every 60s, 60s stabilisation window`),

    h3("4.8 Observability"),
    body("Every API pod exposes Prometheus metrics on /metrics: request counts and durations by route, bytes streamed, active streams, upload results and Node.js runtime metrics. Prometheus scrapes them every five seconds and Grafana shows two provisioned dashboards, one for traffic and one for the runtime."),

    h3("4.9 Infrastructure as Code"),
    body("The Terraform configuration describes the cloud version of the same system on AWS: a VPC across three availability zones, an EKS cluster with three to six t3.large nodes, an ECR repository with image scanning, IAM roles for service accounts, and Helm releases for the AWS Load Balancer Controller, metrics-server and the cluster autoscaler. A cloud overlay switches the image to GHCR, the NGINX service to a LoadBalancer and storage to gp3."),

    h3("4.10 CI/CD with GitHub Actions"),
    body("The pipeline in .github/workflows/ci.yml runs five jobs on every push and pull request. Lint and tests run first. Manifests and Terraform are validated in parallel. The image is built, scanned with Trivy and pushed to GHCR. Finally a fresh kind cluster is created on the runner, the stack is deployed, a sample video is generated and the smoke test and the Postman collection run against the live cluster."),
    ...code(`jobs:
  test:       npm ci, npm run lint, npm test
  manifests:  kubectl kustomize + kubeconform
  terraform:  terraform fmt -check, init, validate
  image:      docker build, Trivy scan, push to GHCR
  e2e:        kind cluster, deploy, smoke test, Newman`),

    h3("4.11 Live Demonstration"),
    body("A single desktop shortcut runs the whole demonstration with no further input. It starts Docker if needed, creates and deploys the cluster on the first run, waits for MongoDB, the API and NGINX to become ready, uploads six demo videos, resets the API to three pods and opens a full screen browser on a guided tour that advances by itself through seven stages: the StreamVault application itself, one stream with every range request and the pod that served it, six videos streaming at once, a burst of requests split across the pods by NGINX, a real load test during which the autoscaler adds pods while a video keeps playing, the kind nodes shown as Docker containers with their pods, and a closing screen with the numbers from that run."),

    ...figure("demo-six.jpg", 600, "Live demo: six videos streaming at once, each label showing the pod that served it"),
  ];
}

function results() {
  startFigs(5);
  return [
    ...chapter("RESULTS"),
    body("All results below were measured on 26 October 2026 on a MacBook with an Apple M5 chip and 16 GB RAM, using Docker 29, kind 0.33 with Kubernetes 1.37 nodes, Node.js 22 in the container image and Terraform 1.17."),
    h3("5.1 Unit and Integration Tests"),
    body("All 84 Jest tests passed in 9 suites. Unit tests cover the range parser, request validation, the error handler, request ids and the video model. Integration tests run the real Express app against an in-memory MongoDB with GridFS and check every endpoint, byte-exact ranges and edge cases."),
    tableReq([
      ["Suite", "Area", "Tests", "Result"],
      ["range", "Range parsing, clamping, 416 cases", "12", "Pass"],
      ["validation", "Create, update and query validation", "7", "Pass"],
      ["errorHandler", "HTTP, Zod and Mongoose errors", "7", "Pass"],
      ["videoModel, requestContext", "Model defaults, request ids", "7", "Pass"],
      ["videos (integration)", "Upload, list, search, stream, download, delete", "25", "Pass"],
      ["edge-cases (integration)", "Empty files, size limit, one byte ranges, HEAD, unicode names", "16", "Pass"],
      ["storage, health-failure", "GridFS ranges, readiness failures", "10", "Pass"],
      ["Total", "", "84", "84 passed, 0 failed"],
    ], [2500, 4126, 900, 1500]),
    ...blank(1),
    ...figure("06-unit-tests.jpg", 520, "Unit tests passing"),
    ...figure("07-integration-tests.jpg", 520, "Integration tests passing"),
    body("Coverage was measured with Jest: 90.45% of lines, 89.18% of statements, 81.69% of functions and 77.04% of branches."),
    ...figure("08-coverage.jpg", 520, "Coverage summary"),

    h3("5.2 API Contract Tests with Postman"),
    body("The Postman collection was run with Newman against the live cluster through NGINX. All 20 requests and 49 assertions passed, with an average response time of 8 ms."),
    tableReq([
      ["Folder", "Requests", "Checks"],
      ["01 Health", "4", "liveness, readiness, health, metrics"],
      ["02 Upload", "3", "upload, missing file 400, invalid title 400"],
      ["03 Metadata", "5", "list, search, get, update, stats"],
      ["04 Streaming", "5", "full 200, range 206, suffix 206, invalid 416, download"],
      ["05 Cleanup", "3", "delete 204, gone 404, second delete 404"],
      ["Total", "20", "49 assertions, 0 failed"],
    ], [2400, 1400, 5226]),
    ...blank(1),
    ...figure("09-postman-newman.jpg", 380, "Newman summary"),

    h3("5.3 Streaming and Load Balancing"),
    body("The smoke test uploaded a video through NGINX, received 206 Partial Content for a 64 KiB range and confirmed that health requests were answered by all three API pods. In the live demo, a burst of 120 requests was split 49, 47 and 24 across the three pods, and six simultaneous streams were served by different replicas."),
    ...figure("10-smoke-video.jpg", 560, "Smoke test: upload, 206 range response and the serving pod"),

    h3("5.4 Autoscaling and Load Test"),
    body("A 180 second autocannon run with 120 connections requested 256 KB ranges of the sample video. The HorizontalPodAutoscaler raised the API from 3 to 6 pods within 30 seconds and to its ceiling of 12 pods 15 seconds later, while NGINX scaled from 2 to 6 pods. After the load stopped, both returned to their minimums."),
    tableReq([
      ["Measure", "Result"],
      ["Requests", "67,861"],
      ["Data streamed", "17.9 GB"],
      ["Average throughput", "421.5 requests per second, 111 MB per second"],
      ["Latency", "p50 304 ms, p99 696 ms"],
      ["Errors, timeouts, non-2xx", "0, 0, 0"],
      ["API replicas", "3 → 6 → 12 → 3"],
      ["NGINX replicas", "2 → 6 → 2"],
    ], [3600, 5426]),
    ...blank(1),
    ...figure("11-hpa-scaleup.jpg", 600, "HPA watch during the load test"),
    ...figure("12-load-test.jpg", 520, "autocannon results"),
    ...figure("13-top-pods.jpg", 520, "CPU and memory of the twelve API pods at peak"),
    ...figure("demo-scale.jpg", 600, "Live demo: API pods being added while a video keeps streaming"),

    h3("5.5 Observability"),
    body("During the load test Grafana showed request rate, p99 latency, active streams and streaming throughput rising together, and the runtime dashboard showed memory, event loop lag and garbage collection for every pod."),
    ...figure("14-grafana-app.jpg", 600, "Grafana application dashboard"),
    ...figure("15-grafana-runtime.jpg", 600, "Grafana Node.js runtime dashboard"),

    h3("5.6 Infrastructure and Pipeline"),
    body("terraform fmt and terraform validate passed for the AWS stack. The final GitHub Actions run passed all five jobs in 5 minutes 46 seconds, including the end to end job that deployed the platform to a new kind cluster on the runner and ran the smoke test and the Postman collection against it."),
    ...figure("16-terraform.jpg", 520, "Terraform format and validation"),
    ...figure("18-ci.jpg", 600, "GitHub Actions run with all five jobs green"),
    ...figure("17-git-log.jpg", 520, "Commit history of the project"),

    h3("5.7 Issues Resolved During Development"),
    tableReq([
      ["Issue", "Fix"],
      ["mongodb driver missing from the production image", "Declared it as a direct dependency"],
      ["limit_req is not allowed inside limit_except", "Rate limit keyed by a method map"],
      ["Default deny policy blocked the mongo-init Job", "Added an explicit egress rule"],
      ["Unicode file names decoded as latin1", "Normalised names to UTF-8"],
      ["trust proxy true allowed rate limit bypass", "Trust exactly one proxy hop"],
      ["storage/ in .gitignore hid src/storage", "Scoped the rule to /storage/"],
      ["Empty files returned 416", "Return 200 with Content-Length 0"],
      ["GHCR needs lowercase image names", "Lowercased the name in the workflow"],
      ["Trivy action tag without v prefix", "Pinned v0.36.0"],
      ["Runner had no ffmpeg for the sample video", "Installed ffmpeg in the e2e job"],
    ], [4800, 4226]),
    ...blank(1),
    h3("5.8 Summary of Results"),
    tableReq([
      ["Measure", "Result"],
      ["Automated tests", "84 of 84 passed, 90.45% line coverage"],
      ["API contract", "20 requests, 49 of 49 assertions passed"],
      ["Docker Compose", "MongoDB, 3 API and NGINX healthy"],
      ["Kubernetes", "3 nodes, 3 API, 2 NGINX, 1 MongoDB pod"],
      ["Autoscaling", "API 3 → 12, NGINX 2 → 6, then back"],
      ["Load test", "67,861 requests, 17.9 GB, 0 errors"],
      ["Terraform", "fmt and validate pass"],
      ["CI/CD", "5 of 5 jobs green"],
    ], [4000, 5026]),
  ];
}

function conclusion() {
  return [
    ...chapter("CONCLUSION"),
    body("The project successfully builds and operates a video streaming platform that is containerised with Docker, load balanced by NGINX and orchestrated and autoscaled by Kubernetes. Keeping every video byte in MongoDB GridFS made the API stateless, which is what allowed the cluster to grow from 3 to 12 API pods under real load without a single failed request."),
    body("The main advantages of this setup are:"),
    bullet("**Scalability:** replicas are added and removed automatically based on CPU, without code or configuration changes."),
    bullet("**Reliable streaming:** range requests survive the proxy, so seeking works no matter which pod answers."),
    bullet("**Availability:** readiness probes, disruption budgets and multiple replicas keep the service up while pods come and go."),
    bullet("**Reproducibility:** the same image and manifests run in Compose, kind, CI and the AWS design."),
    bullet("**Confidence:** unit, integration, contract, smoke and load tests together with dashboards show that the system works and how it behaves."),
    h3("6.1 Future Enhancements"),
    bullet("Move to a managed MongoDB replica set so the data layer survives the loss of a node."),
    bullet("Store media in object storage behind a CDN for global playback."),
    bullet("Add a transcoding queue for adaptive bitrate HLS streams, scaled on queue depth."),
    bullet("Scale on concurrent streams per pod instead of CPU once the workload becomes network bound."),
    bullet("Add TLS, signed images and GitOps based deployment for the cloud environment."),
    body("In conclusion, the project shows that a small team can use widely available open source tools to build a service that scales on demand, balances its own load and can be deployed, tested and observed by anyone from a single repository."),
  ];
}

function references() {
  let k = 0;
  const n = (text) => new Paragraph({
    tabStops: [{ type: TabStopType.LEFT, position: 600 }],
    indent: { left: 600, hanging: 600 },
    spacing: { line: 240, lineRule: "auto", after: 50 },
    children: runs(`[${++k}]\t${text}`, { size: 21 }),
  });
  const acc = "Accessed: Oct. 26, 2026. [Online]. Available:";
  return [
    ...chapter("REFERENCES"),
    n("D. Merkel, “Docker: Lightweight Linux containers for consistent development and deployment,” *Linux Journal*, vol. 2014, no. 239, Mar. 2014."),
    n(`Docker, “Multi-stage builds.” ${acc} https://docs.docker.com/build/building/multi-stage/`),
    n("A. Verma, L. Pedrosa, M. Korupolu, D. Oppenheimer, E. Tune, and J. Wilkes, “Large-scale cluster management at Google with Borg,” in *Proc. 10th European Conf. Computer Systems (EuroSys)*, 2015, doi: 10.1145/2741948.2741964."),
    n(`The Kubernetes Authors, “Kubernetes documentation.” ${acc} https://kubernetes.io/docs/`),
    n("B. Burns, B. Grant, D. Oppenheimer, E. Brewer, and J. Wilkes, “Borg, Omega, and Kubernetes,” *ACM Queue*, vol. 14, no. 1, pp. 70–93, 2016, doi: 10.1145/2898442.2898444."),
    n(`The Kubernetes Authors, “kind: Kubernetes in Docker.” ${acc} https://kind.sigs.k8s.io/`),
    n(`NGINX, “HTTP load balancing,” NGINX documentation. ${acc} https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/`),
    n("R. Fielding, M. Nottingham, and J. Reschke, “HTTP Semantics,” RFC 9110, IETF, Jun. 2022, doi: 10.17487/RFC9110."),
    n(`MongoDB, “GridFS for self-managed deployments.” ${acc} https://www.mongodb.com/docs/manual/core/gridfs/`),
    n(`The Kubernetes Authors, “Horizontal Pod Autoscaling.” ${acc} https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/`),
    n(`Kubernetes SIGs, “metrics-server.” ${acc} https://github.com/kubernetes-sigs/metrics-server`),
    n(`Prometheus Authors, “Prometheus documentation.” ${acc} https://prometheus.io/docs/`),
    n(`Grafana Labs, “Grafana documentation.” ${acc} https://grafana.com/docs/grafana/latest/`),
    n(`HashiCorp, “Terraform documentation.” ${acc} https://developer.hashicorp.com/terraform/docs`),
    n(`GitHub, “GitHub Actions documentation.” ${acc} https://docs.github.com/en/actions`),
    n("J. Humble and D. Farley, *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*. Upper Saddle River, NJ, USA: Addison-Wesley, 2010."),
    n("N. Forsgren, J. Humble, and G. Kim, *Accelerate: The Science of Lean Software and DevOps*. Portland, OR, USA: IT Revolution Press, 2018."),
    n("G. Kim, J. Humble, P. Debois, and J. Willis, *The DevOps Handbook*. Portland, OR, USA: IT Revolution Press, 2016."),
  ];
}
const listLevel = (format, text) => ({
  levels: [{ level: 0, format, text, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
});

const doc = new Document({
  creator: "V. Saaket",
  title: TITLE,
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [{ id: "Normal", name: "Normal", quickFormat: true, run: { font: FONT, size: 24 } }],
  },
  numbering: {
    config: [
      { reference: "bullets", ...listLevel(LevelFormat.BULLET, "●") },
      { reference: "steps", ...listLevel(LevelFormat.DECIMAL, "%1.") },
      { reference: "refs", ...listLevel(LevelFormat.DECIMAL, "[%1]") },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] })] }) },
    children: [
      ...cover(), ...certificate(), ...declaration(), ...acknowledgement(), ...abstract(), ...index(),
      ...introduction(), ...literature(), ...requirements(), ...implementation(), ...results(), ...conclusion(), ...references(),
    ],
  }],
});

Packer.toBuffer(doc)
  .then((b) => require("jszip").loadAsync(b))
  .then(async (zip) => {
    const styles = await zip.file("word/styles.xml").async("string");
    zip.file("word/styles.xml", styles.replace('<w:style w:type="paragraph" w:styleId="Normal">', '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'));
    fs.writeFileSync(OUT, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
    console.log("wrote", OUT);
  });
