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

        const branch =
            process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF.replace('refs/heads/', '')
                .replace('refs/pull/', '').split('/')[1];

        const commit = github.context.eventName === 'pull_request'
            ? github.context.payload.pull_request.head.sha
            : process.env.GITHUB_SHA;



        const provider = 'github';
        const cloneUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}.git`;
        const url = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;
        const repositoryName = process.env.GITHUB_REPOSITORY.split('/').pop();
        const scmRepositoryId = parseInt(process.env.GITHUB_REPOSITORY_ID, 10);

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
            console.log(`Scan ID: ${scanId}`);
        } catch (error) {
            console.error(`Failed to trigger scan: ${error.message}`);
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

            let messageScanResult;
            messageScanResult = Helper.displayScanResultMessage(result, reportLink);

            if (github.context.eventName === 'pull_request') {
                await postComment(messageScanResult, githubToken);
            }
        } catch (error) {
            console.error(`Failed to poll scan results: ${error.message}`);
            process.exit(1);
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


