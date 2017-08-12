const _ = require('underscore');
const {accessories, port = 10000} = require('../../../config');
const Discover = require('harmonyhubjs-discover');
const getClient = require('harmonyhubjs-client');
const log = require('../../utils/log');

let hubs = [];
const discover = new Discover(port + _.size(accessories));
discover.on('update', _hubs => hubs = _hubs);
discover.start();

process.on('SIGTERM', () => discover.stop());

const clients = {};

module.exports = async friendlyName => {
  if (!hubs.length) throw new Error('No Harmony Hubs found');

  const hub = friendlyName ? _.find(hubs, {friendlyName}) : hubs[0];
  if (!hub) throw new Error(`Harmony Hub ${friendlyName} not found`);

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
