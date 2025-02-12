const axios = require('axios')

class SecurityScan {
    constructor(apiToken, dedgeHostUrl) {
        this.apiToken = apiToken;
        this.dedgeHostUrl = dedgeHostUrl;
    }

    async triggerScan(scanPayload) {
        try {
            const response = await axios.post(`${this.dedgeHostUrl}/integrations/scan-processes`, scanPayload, {
                headers: {
                    'X-API-Key': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });
            return response.data.scan_id;
        } catch (error) {
            throw new Error(`Failed to trigger scan: ${error.response.data.error}`);
        }
    }

    async pollScanResults(scanId) {
        try {
            while (true) {
                const response = await axios.get(`${this.dedgeHostUrl}/integrations/scan-processes/${scanId}`, {
                    headers: {
                        'X-API-Key': this.apiToken
                    }
                });

                const status = response.data.status;
                const result = response.data.result;
                const reportLink = response.data.report_link;

                if (status === 'finished') {
                    return { result, reportLink };
                }
                console.log(`Scan status: ${status}`);
                await new Promise(resolve => setTimeout(resolve, 20000)); // Sleep for 20 seconds
            }
        } catch (error) {
            throw new Error(`Failed to poll scan results: ${error.message}`);
        }
    }
}


module.exports = SecurityScan;
