const _ = require('underscore');
const getClient = require('harmonyhubjs-client');
const log = require('../../utils/log');

// Long-running clients have connection issues...
const MAX_CLIENT_DURATION = 1000 * 60 * 5;

process.on('SIGTERM', () => _.invoke(clients, 'end'));

const clients = {};

module.exports = async ({hubIp}) => {
  let client = clients[hubIp];
  if (client) return client;

  const destroy = _.once(er => {
    if (er) log.error(er);
    clearTimeout(destroyTimeoutId);
    delete clients[hubIp];
    try { client.end(); } catch (er) {}
  });

  const destroyTimeoutId = setTimeout(destroy, MAX_CLIENT_DURATION);

  const createClient = async () => {
    const client = await getClient(hubIp);
    client._xmppClient.on('offline', destroy);
    client._xmppClient.on('error', destroy);
    client.config = await client.getAvailableCommands();
    return client;
  };

  try {
    return await (clients[hubIp] = createClient());
  } catch (er) {
    destroy();
    throw er;
  }
};
