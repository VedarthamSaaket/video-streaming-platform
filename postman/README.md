# Postman / Newman API tests

The collection is a full contract test for the running API. It covers health, readiness, metrics,
upload validation, CRUD, search, pagination, full streaming, byte ranges, invalid ranges, downloads and
cleanup.

## Run against Kubernetes

```bash
# kind cluster must be up and StreamVault deployed
npx newman run postman/StreamVault.postman_collection.json \
  -e postman/local.postman_environment.json \
  --working-dir . \
  --reporters cli,junit \
  --reporter-junit-export docs/evidence/newman.xml
```

## Run against Docker Compose

```bash
# change baseUrl in the environment to http://localhost:8080
npx newman run postman/StreamVault.postman_collection.json \
  -e postman/local.postman_environment.json \
  --working-dir .
```

`--working-dir .` is required so the upload request can find `docs/sample/sample.mp4`. Generate the
sample first with `bash scripts/generate-sample.sh`.

## Expected result

- 22 requests
- 50+ assertions
- 0 failures

The upload request saves the new video id into the collection variable `videoId`. Every later request
uses it, including the two cleanup checks after deletion.
