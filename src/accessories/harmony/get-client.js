const _ = require('underscore');
const {accessories, port = 10000} = require('../../../config');
const Discover = require('harmonyhubjs-discover');
const getClient = require('harmonyhubjs-client');

let discover;

const startDiscover = () => {
  discover = new Discover(port + _.size(accessories));
  discover.start();
};

const stopDiscover = () => discover.stop();
process.on('SIGTERM', stopDiscover);

const restartDiscover = () => {
  stopDiscover();
  startDiscover();
};

startDiscover();

const clients = {};

module.exports = async friendlyName => {
  const hubs = _.values(discover.knownHubs);
  if (!hubs.length) {
    restartDiscover();
    throw new Error('No Harmony Hubs found');
  }

  const hub = friendlyName ? _.find(hubs, {friendlyName}) : hubs[0];
  if (!hub) {
    restartDiscover();
    throw new Error(`Harmony Hub ${friendlyName} not found`);
  }

  const {ip} = hub;
  let client = clients[ip];
  if (client) return client;

  try {
    client = await (clients[ip] = getClient(ip));
    client._xmppClient.on('offline', () => delete clients[ip]);
    return client;
  } catch (er) {
    delete clients[ip];
    throw er;
  }
};
