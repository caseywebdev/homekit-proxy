const _ = require('underscore');
const OZW = require('openzwave-shared');

const byDevice = {};

module.exports = ({device, networkKey: NetworkKey}) => {
  const zwave = byDevice[device];
  if (zwave) return zwave;

  const client = new OZW({Logging: false, ConsoleOutput: true, NetworkKey});
  const nodes = {};

  client.on('node ready', (nodeId, node) => {
    nodes[nodeId] = node;
    for (let commandClass in node.classes) {
      const values = node.classes[commandClass];
      for (let index in values) {
        client.emit(`${nodeId}:${commandClass}:${index}:value`, values[index]);
      }
    }
  });

  client.on('value changed', (nodeId, commandClass, value) => {
    const node = nodes[nodeId];
    if (!node) return;

    node.classes[commandClass][value.index] = value;
    client.emit(`${nodeId}:${commandClass}:${value.index}:value`, value);
  });

  client.connect(device);
  return byDevice[device] = {client, nodes};
};

process.on('SIGTERM', () => {
  _.each(byDevice, ({client}, device) => client.disconnect(device));
});
