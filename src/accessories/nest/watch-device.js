const _ = require('underscore');
const EventSource = require('eventsource');
const log = require('../../utils/log');

const DEVICES_URL = 'https://developer-api.nest.com/devices';

const createSource = token => {
  const cbs = {};
  const devices = {};
  const source = new EventSource(`${DEVICES_URL}?auth=${token}`);
  source.on('put', ({data}) =>
    _.each(JSON.parse(data).data, (_devices, device_group) =>
      _.each(_devices, device => {
        device = _.extend({}, device, {device_group});
        devices[device.name_long] = device;
        _.each(cbs[device.name_long], cb => cb(device));
      })
    )
  );
  source.on('error', er => log.error(er));
  return {cbs, devices, source};
};

const clients = {};

process.on('SIGTERM', () => _.invoke(_.map(clients, 'source'), 'close'));

module.exports = ({cb, deviceName, token}) => {
  const client = clients[token] || (clients[token] = createSource[token]);
  if (client.devices[deviceName]) cb(client.devices[deviceName]);
  if (!client.cbs[deviceName]) client.cbs[deviceName] = [];
  client.cbs[deviceName].push(cb);
};
