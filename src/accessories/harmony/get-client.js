const _ = require('underscore');
const {accessories, port = 10000} = require('../../../config');
const Discover = require('harmonyhubjs-discover');
const getClient = require('harmonyhubjs-client');
const log = require('../../utils/log');

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

  const reset = _.once(() => delete clients[ip]);

  try {
    let online = false;
    client = await (clients[ip] = getClient(ip));
    client._xmppClient
      .on('online', () => online = true)
      .on('offline', () => {
        online = false;
        reset();
      })
      .on('error', er => {
        log.error(er);
        reset();
        if (online) client.end();
      });
    return client;
  } catch (er) {
    reset();
    throw er;
  }
};
