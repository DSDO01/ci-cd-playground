const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

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
                console.log(response.data);
                return { result, reportLink };
            }

            console.log(`Scan status: ${status}`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Sleep for 10 seconds
        }
    } catch (error) {
        throw new Error(`Failed to poll scan results: ${error.message}`);
    }
}

async function run() {
    try {
        const apiToken = core.getInput('API_TOKEN', { required: true });
        const dedgeHostUrl = core.getInput('DEDGE_HOST_URL', { required: true });
        const assetId = core.getInput('ASSET_ID');
        const githubToken = core.getInput('GITHUB_TOKEN', { required: true });

        const branch = process.env.GITHUB_REF.replace('refs/heads/', '');
        const commit = process.env.GITHUB_SHA;
        const provider = 'github';
        const cloneUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}.git`;
        const url = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;
        const repositoryName = process.env.GITHUB_REPOSITORY.split('/').pop();
        const scmRepositoryId = parseInt(process.env.GITHUB_REPOSITORY_ID, 10);

        const triggerScanSuccessMessage = "🚀 A security scan has been triggered for this Pull Request. Stay tuned for updates! 🔍";

        const scanPayload = {
            branch,
            commit,
            scm_provider: provider,
            clone_url: cloneUrl,
            url,
            scm_repository_id: scmRepositoryId,
            repository_name: repositoryName,
            asset_id: assetId
        };


        console.log(JSON.stringify(scanPayload));
        let scanId;
        try {
            scanId = await triggerScan(apiToken, dedgeHostUrl, scanPayload);
            core.exportVariable('SCAN_ID', scanId);
        } catch (error) {
            core.setFailed(`Failed to trigger scan: ${error.message}`);
            return; // Exit the function if triggering the scan fails
        }


        displayFormattedMessage(triggerScanSuccessMessage);
        if (github.context.eventName === 'pull_request') {
            await postComment(triggerScanSuccessMessage, githubToken);
        }

        try {
            const scanStatusData = await pollScanResults(apiToken, dedgeHostUrl, scanId);
            const scanStatus = scanStatusData.result;
            const reportLink = scanStatusData.reportLink;
            core.setOutput('scan_status', scanStatus);
            core.setOutput('report_link', reportLink);

            let message;
            if (scanStatus === 'success') {
                message = `✅ Security scan completed successfully! View the detailed report [here](${reportLink}).`;
            } else if (scanStatus === 'failure') {
                message = `❌ Security scan failed. Review the report for more details [here](${reportLink}).`;
            } else {
                message = "⚠️ Security scan finished, but the result is unknown.";
            }

            displayFormattedMessage(message);
            if (github.context.eventName === 'pull_request') {
                await postComment(message, githubToken);
            }
        } catch (error) {
            core.setFailed(`Failed to poll scan results: ${error.message}`);
        }



    } catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

async function postComment(message, token) {
    try {
        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;
        const issueNumber = github.context.payload.pull_request.number;

        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: message
        });
    } catch (error) {
        console.error(`Failed to post comment: ${error.message}`);
    }
}

run();

function displayFormattedMessage(message) {
    const messageLength = message.length + 4; // Add extra space for padding
    const border = '-'.repeat(messageLength);
    console.log(`${border}\n| ${message} |\n${border}`);
}
