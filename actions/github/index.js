const core = require('@actions/core');
const { logMessage } = require('../../shared/utils');
const { DEFAULT_INPUT } = require('../../shared/constants');

try {
    const exampleInput = core.getInput('exampleInput') || DEFAULT_INPUT;
    logMessage(`Example input: ${exampleInput}`);

    // Set an output
    core.setOutput('exampleOutput', 'This is an example output');
} catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
} 
