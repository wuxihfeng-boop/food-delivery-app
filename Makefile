PYTHON ?= python3
PIP ?= pip
NPM ?= npm

.PHONY: backend-install backend-test frontend-install frontend-test frontend-build verify

backend-install:
	cd backend && $(PYTHON) -m venv .venv && . .venv/bin/activate && $(PIP) install -r requirements.txt

backend-test:
	cd backend && .venv/bin/pytest -q

frontend-install:
	cd frontend && $(NPM) install

frontend-test:
	cd frontend && $(NPM) run test:run

frontend-build:
	cd frontend && $(NPM) run build

verify: backend-test frontend-test frontend-build
