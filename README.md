# Scan Action

This repository contains actions for both GitHub and GitLab, designed to facilitate security scanning across different CI/CD platforms.

## Table of Contents:

1. [Introduction](#scan-action)
2. [GitHub Action](#github-action)
   - [Workflow Example](#workflow-example)
3. [GitLab Action](#gitlab-action)
   - [Pipeline Example](#pipeline-example)
4. [Setting Up GitLab Token](#setting-up-gitlab-token)
5. [Shared Code](#shared-code)
6. [Manual Implementation Instructions](#manual-implementation-instructions)
   - [Endpoint and Host](#endpoint-and-host)
   - [Required Data](#required-data)
   - [Obtaining Values for Payload](#obtaining-values-for-payload)
   - [GitHub Manual Implementation](#github-manual-implementation)
   - [GitLab Manual Implementation](#gitlab-manual-implementation)

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

# Manual Implementation Instructions

If you prefer to manually implement the security scanning process without using the provided GitHub or GitLab actions, you can directly interact with the security scan API. Below are the steps and details for both GitHub and GitLab SCM platforms.

### Endpoint and Host

The security scan API is accessible at the following endpoint:

- **Endpoint:** `/integrations/scan-processes`
- **Host:** `DEDGE_HOST_URL` (Replace `DEDGE_HOST_URL` with the actual host URL provided in your environment setup)

### Required Data

The data required to trigger a scan includes:

- `branch`: The branch name where the scan is to be triggered.
- `commit`: The commit SHA at which the scan should be performed.
- `scm_provider`: The source code management (SCM) provider, e.g., 'github' or 'gitlab'.
- `clone_url`: The URL used to clone the repository.
- `url`: The URL to the repository on the SCM platform.
- `scm_repository_id`: The unique identifier for the repository in the SCM.
- `repository_name`: The name of the repository.
- `asset_id`: (Optional) The specific asset ID to scan.

### Obtaining Values for Payload

#### GitHub:
- **branch**: Available as `process.env.GITHUB_REF_NAME` in GitHub Actions.
- **commit**: Available as `process.env.GITHUB_SHA` in GitHub Actions.
- **scm_provider**: Set this to 'github'.
- **clone_url**: Constructed as `https://github.com/${process.env.GITHUB_REPOSITORY}.git`.
- **url**: Constructed as `https://github.com/${process.env.GITHUB_REPOSITORY}`.
- **scm_repository_id**: Available as `process.env.GITHUB_REPOSITORY_ID` in GitHub Actions.
- **repository_name**: Available as `process.env.GITHUB_REPOSITORY` in GitHub Actions, split the value to get the repository name.

#### GitLab:
- **branch**: Available as `process.env.CI_COMMIT_REF_NAME` in GitLab CI/CD.
- **commit**: Available as `process.env.CI_COMMIT_SHA` in GitLab CI/CD.
- **scm_provider**: Set this to 'gitlab'.
- **clone_url**: Available as `process.env.CI_REPOSITORY_URL` in GitLab CI/CD.
- **url**: Constructed as `process.env.CI_PROJECT_URL`.
- **scm_repository_id**: Available as `process.env.CI_PROJECT_ID` in GitLab CI/CD.
- **repository_name**: Available as `process.env.CI_PROJECT_NAME` in GitLab CI/CD.

### GitHub Manual Implementation

1. **Prepare the Payload:**
   Gather all the necessary data as mentioned above. For GitHub, you can extract these from the environment variables available in GitHub Actions or from the repository settings.

2. **Trigger the Scan:**
   Use a tool like `curl` or any HTTP client in your programming language of choice to send a POST request to the API.

   ```bash
   curl -X POST -H "Content-Type: application/json" -H "X-API-Key: YOUR_DEDGE_API_TOKEN" \
        -d '{
            "branch": "main",
            "commit": "commit_sha",
            "scm_provider": "github",
            "clone_url": "https://github.com/user/repo.git",
            "url": "https://github.com/user/repo",
            "scm_repository_id": 123456,
            "repository_name": "repo",
            "asset_id": "optional_asset_id"
        }' \
        "https://DEDGE_HOST_URL/integrations/scan-processes"
   ```

### GitLab Manual Implementation

1. **Prepare the Payload:**
   Similar to GitHub, collect all the necessary data. In GitLab CI/CD, these can be obtained from predefined environment variables.

2. **Trigger the Scan:**
   Use `curl` or another HTTP client to send the POST request.

   ```bash
   curl -X POST -H "Content-Type: application/json" -H "X-API-Key: YOUR_DEDGE_API_TOKEN" \
        -d '{
            "branch": "main",
            "commit": "commit_sha",
            "scm_provider": "gitlab",
            "clone_url": "https://gitlab.com/user/repo.git",
            "url": "https://gitlab.com/user/repo",
            "scm_repository_id": 123456,
            "repository_name": "repo",
            "asset_id": "optional_asset_id"
        }' \
        "https://DEDGE_HOST_URL/integrations/scan-processes"
   ```

By following these steps, you can manually trigger and manage security scans for your repositories in GitHub and GitLab.
