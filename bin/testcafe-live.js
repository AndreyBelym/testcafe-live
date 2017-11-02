#!/usr/bin/env node

const fs                = require('fs');
const CLIArgumentParser = require('testcafe/lib/cli/argument-parser');
const runTestcafe       = require('../src/run-testcafe');

(async () => {
    const arguments = new CLIArgumentParser();

    await arguments.parse(process.argv);

    let running = false;
    
    for (let file of arguments.src) {
        fs.watch(file, async evType => {
            if (running)
                return;

            running = true;

            await runTestcafe(arguments, file);

            running = false;
        });
    }

    running = true;

    await await runTestcafe(arguments);

    running = false;
})();
