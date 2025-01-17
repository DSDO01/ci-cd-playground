const axios = require('axios');
const { Octokit } = require('@octokit/rest');

async function triggerScan(apiToken, dedgeHostUrl, scanPayload) {
    try {
        const response = await axios.post(`${dedgeHostUrl}/integrations/scan-process/start`, scanPayload, {
            headers: {
                'X-API-Key': apiToken,
                'Content-Type': 'application/json'
            }
        });
        console.log(response.data);
        return response.data.scan_id;
    } catch (error) {
        throw new Error(`Failed to trigger scan: ${error.response.data.error}`);
    }
}

async function pollScanResults(apiToken, dedgeHostUrl, scanId) {
    try {
        while (true) {
            const response = await axios.get(`${dedgeHostUrl}/integrations/scan-process/${scanId}`, {
                headers: {
                    'X-API-Key': apiToken
                }
            });

            const status = response.data.status;
            const result = response.data.result;
            const reportLink = response.data.report_link;

            if (status === 'finished') {
                let message;
                if (result === 'success') {
                    message = `✅ Security scan completed successfully! View the detailed report [here](${reportLink}).`;
                } else if (result === 'failure') {
                    message = `❌ Security scan failed. Review the report for more details [here](${reportLink}).`;
                } else {
                    message = "⚠️ Security scan finished, but the result is unknown.";
                }

                console.log(message);
                return { result, message };
            }

            console.log(`Scan status: ${status}`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Sleep for 10 seconds
        }
    } catch (error) {
        throw new Error(`Failed to poll scan results: ${error.message}`);
    }
}

async function postCommentOnPullRequest(message) {
    const githubToken = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: githubToken });
    const { owner, repo } = process.env.GITHUB_REPOSITORY.split('/');
    const pullRequestNumber = process.env.GITHUB_REF.split('/')[2];

    try {
        await octokit.issues.createComment({
            owner,
            repo,
            issue_number: pullRequestNumber,
            body: message
        });
        console.log('Comment posted on pull request.');
    } catch (error) {
        console.error(`Failed to post comment: ${error.message}`);
    }
}

function getGitHubContext() {
    return {
        branch: process.env.GITHUB_REF.replace('refs/heads/', ''),
        commit: process.env.GITHUB_SHA,
        provider: 'github',
        cloneUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}.git`,
        url: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`,
        repositoryName: process.env.GITHUB_REPOSITORY.split('/').pop(),
        scmRepositoryId: parseInt(process.env.GITHUB_REPOSITORY_ID, 10)
    };
}

function getGitLabContext() {
    return {
        branch: process.env.CI_COMMIT_REF_NAME,
        commit: process.env.CI_COMMIT_SHA,
        provider: 'gitlab',
        cloneUrl: process.env.CI_REPOSITORY_URL,
        url: process.env.CI_PROJECT_URL,
        repositoryName: process.env.CI_PROJECT_NAME,
        scmRepositoryId: parseInt(process.env.CI_PROJECT_ID, 10)
    };
}

async function run() {
    try {
        const apiToken = process.env.API_TOKEN;
        const dedgeHostUrl = process.env.DEDGE_HOST_URL;
        const assetId = process.env.ASSET_ID;

        // Determine the environment (GitHub or GitLab)
        const isGitHub = process.env.GITHUB_ACTIONS === 'true';
        const context = isGitHub ? getGitHubContext() : getGitLabContext();

        const scanPayload = {
            branch: context.branch,
            commit: context.commit,
            scm_provider: context.provider,
            clone_url: context.cloneUrl,
            url: context.url,
            scm_repository_id: context.scmRepositoryId,
            repository_name: context.repositoryName,
            asset_id: assetId
        };

        let scanId;
        try {
            scanId = await triggerScan(apiToken, dedgeHostUrl, scanPayload);
            console.log(`Scan ID: ${scanId}`);
        } catch (error) {
            console.error(`Failed to trigger scan: ${error.message}`);
            process.exit(1); // Exit the process if triggering the scan fails
        }

        try {
            const { result, message } = await pollScanResults(apiToken, dedgeHostUrl, scanId);
            console.log(`Scan status: ${result}`);

            // Post a comment on the pull request if running in GitHub and it's a pull request event
            if (isGitHub && process.env.GITHUB_EVENT_NAME === 'pull_request') {
                await postCommentOnPullRequest(message);
            }
        } catch (error) {
            console.error(`Failed to poll scan results: ${error.message}`);
            process.exit(1);
        }

    } catch (error) {
        console.error(`Action failed with error: ${error.message}`);
        process.exit(1);
    }
}

run(); 
