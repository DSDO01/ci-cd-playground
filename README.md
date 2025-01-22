# Scan Action

This repository contains actions for both GitHub and GitLab, designed to facilitate security scanning across different CI/CD platforms.

## Table of Contents:

1. [Introduction](#scan-action)
2. [GitHub Action](#github-action)
   - [Workflow Example](#workflow-example)
3. [GitLab Action](#gitlab-action)
   - [Pipeline Example](#pipeline-example)
5. [Setting Up GitLab Token](#setting-up-gitlab-token)
4. [Shared Code](#shared-code)


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
    permissions:
      contents: read
      pull-requests: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4.2.2
      - name: Set up Node.js
        uses: actions/setup-node@v4.1.0
        with:
          node-version: "20"
      - name: Run GitHub Action
        uses: DSDO01/ci-cd-playground/actions/github@main
        with:
          API_TOKEN: ${{ secrets.DEDGE_API_TOKEN }}
          DEDGE_HOST_URL: ${{ vars.DEDGE_HOST_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ASSET_ID: ${{ vars.ASSET_ID }} # Optional, for triggering a scan on a specific asset.
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
    - curl -LJO https://raw.githubusercontent.com/DSDO01/ci-cd-playground/refs/heads/main/actions/gitlab/dist/index.cjs
    - node index.cjs
  variables:
    API_TOKEN: $DEDGE_API_TOKEN
    DEDGE_HOST_URL: $DEDGE_HOST_URL
    GITLAB_TOKEN: $GITLAB_TOKEN_COMMENT # Required for commenting on merge requests.
    ASSET_ID: $DEDGE_ASSET_ID # Optional, for triggering a scan on a specific asset.
  only:
    - merge_requests
    - main
```

## Setting Up GitLab Token

To ensure the GitLab Action operates effectively, a GitLab token must be created and configured properly.

#### Steps to Create a GitLab Personal Access Token:
1. Navigate to your GitLab profile, go to **Settings > Access Tokens**.
2. Enter a name for the token, such as `ci-cd-scan`.
3. Optionally set an expiration date.
4. Enable the `api` scope for full access.
5. Click **Create personal access token** and securely save the token.

#### Adding the Token as a CI/CD Variable:
1. Go to your GitLab project's **Settings > CI/CD > Variables**.
2. Click **Add Variable**.
3. Fill in the details:
   - **Key:** `GITLAB_TOKEN_COMMENT`
   - **Value:** Paste the previously created GitLab personal access token.
   - **Type:** Variable
   - **Environment Scope:** All (adjust if specific environments are required).
4. Save the variable.

Completing these steps ensures that the pipeline can comment on merge requests.

## Shared Code

The `actions/common/` directory contains common utilities and classes, including the `SecurityScan` class. This class is integral to both GitHub and GitLab actions for managing the security scanning process.
