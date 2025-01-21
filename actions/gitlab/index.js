import { SecurityScan } from '../common/index.js';
import { Helper } from '../common/helper.js';

async function run() {
    try {
        const apiToken = process.env.API_TOKEN;
        const dedgeHostUrl = process.env.DEDGE_HOST_URL;
        const gitlabToken = process.env.GITLAB_TOKEN;

        if (!apiToken) {
            throw new Error('API_TOKEN is required');
        }
        if (!dedgeHostUrl) {
            throw new Error('DEDGE_HOST_URL is required');
        }
        if (!gitlabToken) {
            throw new Error('GITLAB_TOKEN is required');
        }

        const assetId = process.env.ASSET_ID; // Assuming assetId is optional, no check added.


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

        try {
            let scanId = await SecurityScan.triggerScan(apiToken, dedgeHostUrl, scanPayload);
            console.log(`Scan ID: ${scanId}`);
        } catch (error) {
            console.error(`Failed to trigger scan: ${error.message}`);
            process.exit(1); // Exit the process if triggering the scan fails
        }

        const triggerScanSuccessMessage = Helper.displayTriggerScanSuccessMessage();
        if (process.env.CI_MERGE_REQUEST_IID) {
            await postCommentOnMergeRequest(triggerScanSuccessMessage, gitlabToken);
        }

        try {
            const { result, reportLink } = await pollScanResults(apiToken, dedgeHostUrl, scanId);
            console.log(`Scan status: ${result}`);

            let messageScanResult;
            messageScanResult = Helper.displayScanResultMessage(result, reportLink);

            if (process.env.CI_MERGE_REQUEST_IID) {
                await postCommentOnMergeRequest(messageScanResult, gitlabToken);
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
    const projectId = process.env.CI_PROJECT_ID;
    const mergeRequestIid = process.env.CI_MERGE_REQUEST_IID;

    try {
        await axios.post(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mergeRequestIid}/notes`, {
            body: message
        }, {
            headers: {
                'PRIVATE-TOKEN': token,
                'Content-Type': 'application/json'
            }
        });
        console.log('Comment posted on merge request.');
    } catch (error) {
        console.log(`Failed to post comment on merge request: ${error.message}`);
    }
}

run();

