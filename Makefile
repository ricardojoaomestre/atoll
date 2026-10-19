.DEFAULT_GOAL := run

UI_URL := http://127.0.0.1:5173
API_URL := http://127.0.0.1:8787/api/health

.PHONY: run install check open

check:
	@node -e 'const major = Number(process.versions.node.split(".")[0]); if (major < 20) { console.error("Atoll needs Node 20 or newer. This machine has " + process.versions.node); process.exit(1); }'

install: check
	npm run install:all

open:
	@if command -v open >/dev/null 2>&1; then open "$(UI_URL)"; \
	elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$(UI_URL)"; \
	elif command -v wslview >/dev/null 2>&1; then wslview "$(UI_URL)"; \
	else printf 'Open %s\n' "$(UI_URL)"; fi

run: install
	@if curl -sf "$(UI_URL)" >/dev/null 2>&1 && curl -sf "$(API_URL)" >/dev/null 2>&1; then \
		printf 'Atoll is already running at %s\n' "$(UI_URL)"; \
		$(MAKE) --no-print-directory open; \
	else \
		( i=0; \
		  while [ $$i -lt 80 ]; do \
		    if curl -sf "$(UI_URL)" >/dev/null 2>&1; then \
		      $(MAKE) --no-print-directory open; \
		      exit 0; \
		    fi; \
		    i=$$((i + 1)); \
		    sleep 0.25; \
		  done; \
		  printf 'Atoll did not answer on %s\n' "$(UI_URL)"; \
		) & waiter=$$!; \
		trap 'kill $$waiter 2>/dev/null || true' EXIT INT TERM; \
		npm run dev; \
		status=$$?; \
		kill $$waiter 2>/dev/null || true; \
		exit $$status; \
	fi
