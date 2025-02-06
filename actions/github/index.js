const core = require('@actions/core');
const github = require('@actions/github');
const SecurityScan = require('../common/index.js');
const Helper = require('../common/helper.js');

async function run() {
    try {
        const apiToken = core.getInput('API_TOKEN', { required: true });
        const dedgeHostUrl = core.getInput('DEDGE_HOST_URL', { required: true });
        const githubToken = core.getInput('GITHUB_TOKEN', { required: true });
        const assetId = core.getInput('ASSET_ID');

        const scan = new SecurityScan(apiToken, dedgeHostUrl);
        const branch = getBranchName();
        const commit = github.context.eventName === 'pull_request'
            ? github.context.payload.pull_request.head.sha
            : process.env.GITHUB_SHA;

        const provider = 'github';
        const cloneUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}.git`;
        const url = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;

        const scmRepositoryId = await getRepositoryId(githubToken);
        const repositoryName = await getRepositoryName(githubToken);

        if (!branch || !commit || !scmRepositoryId || !repositoryName) {
            throw new Error("⛔ Missing required data for scanPayload. Aborting scan.");
        }

        let scanPayload = {
            branch,
            commit,
            scm_provider: provider,
            clone_url: cloneUrl,
            url,
            scm_repository_id: scmRepositoryId,
            repository_name: repositoryName,
            asset_id: assetId
        };

        let scanId;

        try {
            scanId = await scan.triggerScan(scanPayload);
            core.exportVariable('SCAN_ID', scanId);
            console.log(`✅ Scan ID: ${scanId}`);
        } catch (error) {
            console.error(`⛔ Failed to trigger scan: ${error.message}`);
            process.exit(1);
        }

        const triggerScanSuccessMessage = Helper.displayTriggerScanSuccessMessage();
        if (github.context.eventName === 'pull_request') {
            await postComment(triggerScanSuccessMessage, githubToken);
        }

        try {
            const { result, reportLink } = await scan.pollScanResults(scanId);
            core.setOutput('scan_status', result);
            core.setOutput('report_link', reportLink);

            let messageScanResult = Helper.displayScanResultMessage(result, reportLink);
            if (github.context.eventName === 'pull_request') {
                await postComment(messageScanResult, githubToken);
            }
        } catch (error) {
            console.error(`⛔ Failed to poll scan results: ${error.message}`);
            process.exit(1);
        }

    } catch (error) {
        core.setFailed(`⛔ Action failed with error: ${error.message}`);

    }
}

function getBranchName() {
    const githubEvent = github.context.eventName;
    if (githubEvent === "pull_request") {
        return process.env.GITHUB_HEAD_REF;
    } else if (process.env.GITHUB_REF) {
        return process.env.GITHUB_REF.startsWith("refs/tags/")
            ? process.env.GITHUB_REF.replace("refs/tags/", "")
            : process.env.GITHUB_REF.replace("refs/heads/", "");
    }
    throw new Error("⛔ Could not determine branch or tag.");
}

/**
 * Gets the GitHub repository ID securely.
 * If not available in `process.env`, it is obtained through the GitHub API.
 */
async function getRepositoryId(token) {
    if (process.env.GITHUB_REPOSITORY_ID) {
        return parseInt(process.env.GITHUB_REPOSITORY_ID, 10);
    }

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    try {
        const { data } = await octokit.rest.repos.get({ owner, repo });
        console.log(`✅ Repository ID obtained: ${data.id}`);
        return data.id;
    } catch (error) {
        throw new Error(`⛔ Could not retrieve repository ID: ${error.message}`);
    }
}

/**
 * Gets the GitHub repository name securely.
 * If `GITHUB_REPOSITORY` is not available, it is obtained from the GitHub API.
 */
async function getRepositoryName(token) {
    if (process.env.GITHUB_REPOSITORY) {
        return process.env.GITHUB_REPOSITORY.split('/').pop();
    }

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    try {
        const { data } = await octokit.rest.repos.get({ owner, repo });
        console.log(`✅ Repository name obtained: ${data.name}`);
        return data.name;
    } catch (error) {
        throw new Error(`⛔ Could not retrieve repository name: ${error.message}`);
    }
}

/**
 * Publishes a comment on the Pull Request with a determined message.
 * If it fails, it shows a warning but **does not stop the execution**.
 */
async function postComment(message, token) {
    try {
        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;
        const issueNumber = github.context.payload.pull_request?.number;

        if (!issueNumber) {
            console.warn("⚠️ No pull request number found, skipping comment.");
            return;
        }

        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: message
        });

        console.log("✅ Comment posted successfully");

    } catch (error) {
        console.error(`⚠️ Failed to post comment: ${error.message}`);
    }
}

run();
