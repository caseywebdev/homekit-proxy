const _ = require('underscore');
const {accessories, port = 10000} = require('../../../config');
const Discover = require('harmonyhubjs-discover');
const getClient = require('harmonyhubjs-client');

// Long-running clients have connection issues...
const MAX_CLIENT_DURATION = 1000 * 60 * 10;

let discover;

const startDiscover = () => {
  discover = new Discover(port + _.size(accessories));
  discover.start();
};

const stopDiscover = () => discover.stop();
process.on('SIGTERM', () => {
  stopDiscover();
  _.invoke(clients, 'end');
});

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
    const destroy = _.once(() => {
      clearTimeout(destroyTimeoutId);
      delete clients[ip];
      client.end();
    });
    const destroyTimeoutId = setTimeout(destroy, MAX_CLIENT_DURATION);
    client._xmppClient.on('offline', destroy);
    return client;
  } catch (er) {
    delete clients[ip];
    throw er;
  }
};
