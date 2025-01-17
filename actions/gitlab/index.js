const axios = require('axios');
const { logMessage } = require('../../shared/utils').default;
const { DEFAULT_INPUT } = require('../../shared/constants');

async function run() {
    try {
        const apiToken = process.env.API_TOKEN;
        const dedgeHostUrl = process.env.DEDGE_HOST_URL;
        const assetId = process.env.ASSET_ID || DEFAULT_INPUT;

        const branch = process.env.CI_COMMIT_REF_NAME;
        const commit = process.env.CI_COMMIT_SHA;
        const provider = 'gitlab';
        const cloneUrl = process.env.CI_REPOSITORY_URL;
        const url = process.env.CI_PROJECT_URL;
        const repositoryName = process.env.CI_PROJECT_NAME;
        const scmRepositoryId = process.env.CI_PROJECT_ID;

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
        logMessage(`Scan ID: ${scanId}`);

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

                logMessage(message);
                break;
            }

            logMessage(`Scan status: ${status}`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Sleep for 10 seconds
        }
    } catch (error) {
        logMessage(`Action failed with error: ${error.message}`);
        process.exit(1);
    }
}

run(); 
