const core = require('@actions/core');

try {
    const exampleInput = core.getInput('exampleInput');
    console.log(`Example input: ${exampleInput}`);

    // Set an output
    core.setOutput('exampleOutput', 'This is an example output');
} catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
} 
