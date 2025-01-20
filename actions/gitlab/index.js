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
        const apiToken = process.env.API_TOKEN;
        const dedgeHostUrl = process.env.DEDGE_HOST_URL;

        if (!apiToken) {
            throw new Error('API_TOKEN is required');
        }
        if (!dedgeHostUrl) {
            throw new Error('DEDGE_HOST_URL is required');
        }

        const assetId = process.env.ASSET_ID; // Assuming assetId is optional, no check added.

        const triggerScanSuccessMessage = "🚀 A security scan has been triggered for this Pull Request. Stay tuned for updates! 🔍";

        const scanPayload = {
            branch: process.env.CI_COMMIT_REF_NAME,
            commit: process.env.CI_COMMIT_SHA,
            scm_provider: 'gitlab',
            clone_url: process.env.CI_REPOSITORY_URL,
            url: process.env.CI_PROJECT_URL,
            scm_repository_id: parseInt(process.env.CI_PROJECT_ID, 10),
            repository_name: process.env.CI_PROJECT_NAME,
            asset_id: assetId
        };

        console.log(JSON.stringify(scanPayload));
        let scanId;
        try {
            scanId = await triggerScan(apiToken, dedgeHostUrl, scanPayload);
            console.log(`Scan ID: ${scanId}`);
        } catch (error) {
            console.error(`Failed to trigger scan: ${error.message}`);
            process.exit(1); // Exit the process if triggering the scan fails
        }

        displayFormattedMessage(triggerScanSuccessMessage);
        if (process.env.CI_MERGE_REQUEST_IID) {
            await postCommentOnMergeRequest(triggerScanSuccessMessage);
        }

        try {
            const { result, reportLink } = await pollScanResults(apiToken, dedgeHostUrl, scanId);
            console.log(`Scan status: ${result}`);

            let message;
            if (result === 'success') {
                message = `✅ Security scan completed successfully! View the detailed report [here](${reportLink}).`;
            } else if (result === 'failure') {
                message = `❌ Security scan failed. Review the report for more details [here](${reportLink}).`;
            } else {
                message = "⚠️ Security scan finished, but the result is unknown.";
            }

            displayFormattedMessage(message);
            if (process.env.CI_MERGE_REQUEST_IID) {
                await postCommentOnMergeRequest(message);
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

async function postCommentOnMergeRequest(message) {
    const gitlabToken = process.env.GITLAB_TOKEN;
    const projectId = process.env.CI_PROJECT_ID;
    const mergeRequestIid = process.env.CI_MERGE_REQUEST_IID;

    if (!gitlabToken) {
        console.log('Skipping comment posting as GITLAB_TOKEN is not set.');
        return;
    }

    try {
        await axios.post(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mergeRequestIid}/notes`, {
            body: message
        }, {
            headers: {
                'PRIVATE-TOKEN': gitlabToken,
                'Content-Type': 'application/json'
            }
        });
        console.log('Comment posted on merge request.');
    } catch (error) {
        console.log(`Failed to post comment on merge request: ${error.message}`);
    }
}

run();

function displayFormattedMessage(message) {
    const messageLength = message.length + 4; // Add extra space for padding
    const border = '-'.repeat(messageLength);
    console.log(`${border}\n| ${message} |\n${border}`);
}
