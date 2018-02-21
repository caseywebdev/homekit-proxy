const _ = require('underscore');
const EventSource = require('eventsource');
const log = require('../../utils/log');
const sleep = require('../../utils/sleep');

const URL = 'https://developer-api.nest.com';

const clients = {};

const getClient = token => {
  if (clients[token]) return clients[token];

  const handleError = async er => {
    client.source.close();
    log.error(er);
    log.error('Reconnecting to Nest in 10 seconds...');
    await sleep(10);
    client.source = createSource();
  };

  const createSource = () => {
    const source = new EventSource(`${URL}?auth=${token}`);
    source.on('put', ({data}) => {
      try {
        const {devices: _devices, structures} = JSON.parse(data).data;
        _.each(_.extend({}, _devices, {structures}), (_devices, device_group) =>
          _.each(_devices, device => {
            device = _.extend({}, device, {device_group});
            const name = device.name_long || device.name;
            devices[name] = device;
            _.each(cbs[name], cb => cb(device));
          })
        );
      } catch (er) {
        handleError(er);
      }
    });
    source.on('error', handleError);
    return source;
  };

  const cbs = {};
  const devices = {};
  const client = clients[token] = {cbs, devices, source: createSource()};

  return client;
};

process.on('SIGTERM', () => _.invoke(_.map(clients, 'source'), 'close'));

module.exports = ({cb, deviceName, token}) => {
  const client = getClient(token);
  if (client.devices[deviceName]) cb(client.devices[deviceName]);
  if (!client.cbs[deviceName]) client.cbs[deviceName] = [];
  client.cbs[deviceName].push(cb);
};
