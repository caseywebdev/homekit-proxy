const _ = require('underscore');
const {accessories, port = 10000} = require('../../../config');
const Discover = require('harmonyhubjs-discover');
const getClient = require('harmonyhubjs-client');

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

  client = await (clients[ip] = getClient(ip));
  client._xmppClient.on('error', () => client.end());
  client._xmppClient.on('offline', () => delete clients[ip]);
  return client;
};
