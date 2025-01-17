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
                let message;
                if (result === 'success') {
                    message = `✅ Security scan completed successfully! View the detailed report [here](${reportLink}).`;
                } else if (result === 'failure') {
                    message = `❌ Security scan failed. Review the report for more details [here](${reportLink}).`;
                } else {
                    message = "⚠️ Security scan finished, but the result is unknown.";
                }

                console.log(message);
                return result;
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
        const assetId = process.env.ASSET_ID;

        const branch = process.env.CI_COMMIT_REF_NAME;
        const commit = process.env.CI_COMMIT_SHA;
        const provider = 'gitlab';
        const cloneUrl = process.env.CI_REPOSITORY_URL;
        const url = process.env.CI_PROJECT_URL;
        const repositoryName = process.env.CI_PROJECT_NAME;
        const scmRepositoryId = parseInt(process.env.CI_PROJECT_ID, 10);

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

        let scanId;
        try {
            scanId = await triggerScan(apiToken, dedgeHostUrl, scanPayload);
            console.log(`Scan ID: ${scanId}`);
        } catch (error) {
            console.error(`Failed to trigger scan: ${error.message}`);
            process.exit(1); // Exit the process if triggering the scan fails
        }

        try {
            const scanStatus = await pollScanResults(apiToken, dedgeHostUrl, scanId);
            console.log(`Scan status: ${scanStatus}`);
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
