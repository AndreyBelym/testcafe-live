const createTestCafe = require('testcafe');
const exitHook       = require('async-exit-hook');
const remotesWizard  = require('testcafe/lib/cli/remotes-wizard');


let testCafe     = null;
let browsers     = null;
let runner       = null;
let runnableConf = null;


module.exports = async function runTests (argParser, newFile) {
    var opts              = argParser.opts;
    var port1             = opts.ports && opts.ports[0];
    var port2             = opts.ports && opts.ports[1];
    var externalProxyHost = opts.proxy;

    if (!testCafe) {
        testCafe = await createTestCafe(opts.hostname, port1, port2);

        testCafe.origClose = testCafe.close;

        testCafe.close = async () => new Promise(() => {});
    }

    var concurrency    = argParser.concurrency || 1;

    if (!browsers) {
        const remoteBrowsers = await remotesWizard(testCafe, argParser.remoteCount, opts.qrCode);

        browsers = argParser.browsers.concat(remoteBrowsers);
    }

    var reporters      = argParser.opts.reporters.map(r => {
        return {
            name:      r.name,
            outStream: r.outFile ? fs.createWriteStream(r.outFile) : void 0
        };
    });

    reporters.forEach(r => runner.reporter(r.name, r.outStream));

    if (!runner) {
        runner = testCafe.createRunner();

        runner
            .useProxy(externalProxyHost)
            .src(argParser.src)
            .browsers(browsers)
            .concurrency(concurrency)
            .filter(argParser.filter)
            .screenshots(opts.screenshots, opts.screenshotsOnFails)
            .startApp(opts.app, opts.appInitDelay);

        runnableConf = await runner.bootstrapper.createRunnableConfiguration();

        const browserSet = runnableConf.browserSet;

        browserSet.origDispose = browserSet.dispose;
        
        browserSet.dispose = async () => {};

        runner.bootstrapper.createRunnableConfiguration = async () => runnableConf;
    }

    if (newFile) {
        runner.bootstrapper.sources = [newFile];

        runnableConf.tests = await runner.bootstrapper._getTests();
    }

    await runner.run(opts);
};

exitHook(cb => {
    Promise.resolve()
        .then(() => {
            if (runnableConf)
                return runnableConf.browserSet.origDispose();
        })
        .then(() => {
            if (testCafe)
                return testCafe.origClose();
        })
        .then(cb);
});