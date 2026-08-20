const path = require('path');

const launcher = require(path.resolve(process.argv[2]));
launcher.main(path.resolve(process.argv[3]));
