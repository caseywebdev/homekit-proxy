const _ = require('underscore');
const {port = 10000} = require('../../../config');
const Discover = require('harmonyhubjs-discover');
const getClient = require('harmonyhubjs-client');

let hubs = [];
const discover = new Discover(port);
discover.on('update', _hubs => hubs = _hubs);
discover.start();

process.on('SIGTERM', () => discover.stop());

module.exports = async friendlyName => {
  if (!hubs.length) throw new Error('No Harmony Hubs found');

  const hub = friendlyName ? _.find(hubs, {friendlyName}) : hubs[0];
  if (!hub) throw new Error(`Harmony Hub ${friendlyName} not found`);

  return getClient(hub.ip);
};
