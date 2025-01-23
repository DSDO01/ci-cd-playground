# Makefile to build GitHub and GitLab actions

.PHONY: build install-dependencies github gitlab

build: install-dependencies github gitlab

install-dependencies:
	cd actions/common && npm install

github:
	@echo "Building GitHub action..."
	cd actions/github && npm install && npm run build

gitlab:
	@echo "Building GitLab action..."
	cd actions/gitlab && npm install && npm run build
