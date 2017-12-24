const {promisify} = require('util');

const sleep = promisify(setTimeout);

module.exports = async n => sleep(n * 1000);
