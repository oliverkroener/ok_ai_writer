.PHONY: help
help: ## Displays this list of targets with descriptions
	@echo "The following commands are available:\n"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: docs
docs: ## Generate projects docs (from "Documentation" directory)
	mkdir -p Documentation-GENERATED-temp
	docker run --rm --pull always -v "$(shell pwd)":/project -t ghcr.io/typo3-documentation/render-guides:latest --config=Documentation

.PHONY: docs-watch
docs-watch: ## Watch Documentation directory and regenerate on changes
	@echo "Watching Documentation/ for changes... (Ctrl+C to stop)"
	@while true; do \
		inotifywait -q -r -e modify,create,delete,move Documentation/ 2>/dev/null || \
		fswatch -1 -r Documentation/ 2>/dev/null || \
		(echo "Install inotify-tools or fswatch for file watching"; exit 1); \
		echo "\n--- Change detected, regenerating docs... ---\n"; \
		$(MAKE) docs; \
	done