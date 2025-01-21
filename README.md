# Scan Action

This repository contains actions for both GitHub and GitLab, designed to facilitate security scanning across different CI/CD platforms.

## GitHub Action

Located in `actions/github/`. This action is triggered by events specified in the GitHub Actions workflow file `github-ci/ci.yml`. It handles security scanning for pull requests and pushes to the main branch.

### Workflow Example

Here is an example of how the GitHub Action is configured in the workflow:

```yaml
name: "Execute CI/CD Scan"
on:
  pull_request:
    types: [opened, synchronize, closed]
  push:
    branches:
      - main

jobs:
  scan:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4.2.2
      - uses: actions/setup-node@v4.1.0
        with:
          node-version: "20"
      - run: npm install
      - uses: DSDO01/ci-cd-playground/actions/github@main
        with:
          API_TOKEN: ${{ secrets.API_TOKEN }}
          DEDGE_HOST_URL: ${{ vars.DEDGE_HOST_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ASSET_ID: ${{ vars.ASSET_ID }}
```

## GitLab Action

Located in `actions/gitlab/`. This action is configured to run in GitLab CI/CD pipelines as defined in `.gitlab-ci.yml`. It is specifically designed for merge requests and the main branch.

### Pipeline Example

Here is an example of how the GitLab Action is configured in the pipeline:

```yaml
stages:
  - scan

scan_job:
  stage: scan
  image: node:20
  script:
    - cd actions
    - npm install
    - node gitlab/index.js
  variables:
    API_TOKEN: $API_TOKEN
    DEDGE_HOST_URL: $DEDGE_HOST_URL
    GITLAB_TOKEN: $GITLAB_TOKEN
    ASSET_ID: $ASSET_ID
  only:
    - merge_requests
    - main
```

## Shared Code

Common utilities and classes are located in the `actions/common/` directory. This includes the `SecurityScan` class which is used by both GitHub and GitLab actions to handle the security scanning process.
