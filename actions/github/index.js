const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

async function run() {
    try {
        const apiToken = core.getInput('api_token', { required: true });
        const dedgeHostUrl = core.getInput('dedge_host_url', { required: true });
        const assetId = core.getInput('asset_id');

        const branch = process.env.GITHUB_REF.replace('refs/heads/', '');
        const commit = process.env.GITHUB_SHA;
        const provider = 'github';
        const cloneUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}.git`;
        const url = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;
        const repositoryName = process.env.GITHUB_REPOSITORY.split('/').pop();
        const scmRepositoryId = process.env.GITHUB_REPOSITORY_ID;

        // Create payload for scan
        const scanPayload = {
            branch,
            commit,
            provider,
            clone_url: cloneUrl,
            url,
            repository_name: repositoryName,
            scm_repository_id: scmRepositoryId,
            asset_id: assetId
        };

        // Trigger Scan
        const triggerResponse = await axios.post(`${dedgeHostUrl}/api/integrations/scan-process/start`, scanPayload, {
            headers: {
                'X-API-Key': apiToken,
                'Content-Type': 'application/json'
            }
        });

        const scanId = triggerResponse.data.scan_id;
        core.exportVariable('SCAN_ID', scanId);

        if (github.context.eventName === 'pull_request') {
            const commentBody = "🚀 A security scan has been triggered for this Pull Request. Stay tuned for updates! 🔍";
            await postComment(commentBody);
        }

        // Poll for Scan Results
        while (true) {
            const pollResponse = await axios.get(`${dedgeHostUrl}/api/integrations/scan-process/${scanId}`, {
                headers: {
                    'X-API-Key': apiToken
                }
            });

            const status = pollResponse.data.status;
            const result = pollResponse.data.result;
            const reportLink = pollResponse.data.report_link;

            if (status === 'finished') {
                let message;
                if (result === 'success') {
                    message = `✅ Security scan completed successfully! View the detailed report [here](${reportLink}).`;
                } else if (result === 'failure') {
                    message = `❌ Security scan failed. Review the report for more details [here](${reportLink}).`;
                } else {
                    message = "⚠️ Security scan finished, but the result is unknown.";
                }

                if (github.context.eventName === 'pull_request') {
                    await postComment(message);
                }

                core.setOutput('scan_status', result);
                break;
            }

            console.log(`Scan status: ${status}`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Sleep for 10 seconds
        }
    } catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

async function postComment(message) {
    const token = core.getInput('github_token', { required: true });
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const issueNumber = github.context.payload.pull_request.number;

    await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: message
    });
}

run();
