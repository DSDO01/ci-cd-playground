const { logMessage } = require('../../shared/utils');
const { DEFAULT_INPUT } = require('../../shared/constants');

// Example input
const exampleInput = process.argv[2] || DEFAULT_INPUT;
logMessage(`Example input: ${exampleInput}`);

// Example output
logMessage("This is an example output"); 
