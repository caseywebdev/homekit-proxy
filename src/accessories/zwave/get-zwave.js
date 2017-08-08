const _ = require('underscore');
const OZW = require('openzwave-shared');

const byDevice = {};

module.exports = ({device, networkKey: NetworkKey}) => {
  const zwave = byDevice[device];
  if (zwave) return zwave;

  const client = new OZW({Logging: false, ConsoleOutput: true, NetworkKey});
  const values = {};
  const setValue = (nodeId, commandClass, {instance, index, value}) => {
    const key = [nodeId, commandClass, instance, index].join('-');
    values[key] = value;
    console.log(key, '=', value);
    client.emit(`value:${key}`, value);
  };
  client
    .on('value added', setValue)
    .on('value changed', setValue)
    .connect(device);
  return byDevice[device] = {client, values};
};

process.on('SIGTERM', () => {
  _.each(byDevice, ({client}, device) => client.disconnect(device));
});
