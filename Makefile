# Makefile to build GitHub and GitLab actions

.PHONY: all github gitlab

all: github gitlab

github:
	@echo "Building GitHub action..."
	cd actions/github && npm install && npm run build

gitlab:
	@echo "Building GitLab action..."
	cd actions/gitlab && npm install && npm run build
