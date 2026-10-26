SHELL := /bin/bash
IMAGE ?= streamvault:local
BASE_URL ?= http://localhost:30080

.PHONY: help install lint test compose-up compose-down kind-up kind-down deploy smoke seed load hpa logs kind-down clean images

help:
	@echo "StreamVault targets"
	@echo "  make install      install dependencies"
	@echo "  make lint         run ESLint"
	@echo "  make test         run Jest"
	@echo "  make compose-up   start MongoDB + 3 API replicas + NGINX with Docker Compose"
	@echo "  make compose-down stop the Compose stack"
	@echo "  make kind-up      create the kind cluster with metrics-server"
	@echo "  make deploy       build the image, load it and deploy to kind"
	@echo "  make seed         upload the sample video"
	@echo "  make smoke        run the smoke test"
	@echo "  make load         run a 60s load test"
	@echo "  make hpa          run the HPA scaling demo"
	@echo "  make logs         follow the API logs"
	@echo "  make clean        delete the kind cluster"

install:
	npm ci

lint:
	npm run lint

test:
	npm test

compose-up:
	docker compose up --build -d --scale app=3
	docker compose ps

compose-down:
	docker compose down

kind-up:
	bash scripts/kind-up.sh

kind-down:
	bash scripts/kind-down.sh

deploy:
	bash scripts/deploy-local.sh

smoke:
	bash scripts/smoke-test.sh $(BASE_URL)

seed:
	bash scripts/seed.sh $(BASE_URL)

load:
	node scripts/load-test.js --url $(BASE_URL)

hpa:
	bash scripts/hpa-demo.sh $(BASE_URL)

logs:
	kubectl -n streamvault logs -l app=streamvault-app --tail=100 -f

images:
	docker images | grep -E "streamvault|nginx|mongo"

clean:
	bash scripts/kind-down.sh
