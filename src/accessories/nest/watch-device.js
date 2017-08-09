const _ = require('underscore');
const EventSource = require('eventsource');
const log = require('../../utils/log');

const DEVICES_URL = 'https://developer-api.nest.com';

const createSource = token => {
  const cbs = {};
  const devices = {};
  const source = new EventSource(`${DEVICES_URL}?auth=${token}`);
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
      log.error(er);
    }
  });
  source.on('error', log.error);
  return {cbs, devices, source};
};

const clients = {};

process.on('SIGTERM', () => _.invoke(_.map(clients, 'source'), 'close'));

module.exports = ({cb, deviceName, token}) => {
  const client = clients[token] || (clients[token] = createSource(token));
  if (client.devices[deviceName]) cb(client.devices[deviceName]);
  if (!client.cbs[deviceName]) client.cbs[deviceName] = [];
  client.cbs[deviceName].push(cb);
};
