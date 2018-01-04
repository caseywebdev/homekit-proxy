const _ = require('underscore');

const getAction = ({command, device}) => {
  const lowerCmd = command.toLowerCase();
  for (let group of device.controlGroup) {
    for (let cmd of group.functions) {
      if (cmd.name.toLowerCase() === lowerCmd) return cmd.action;
    }
  }

  throw new Error(
    `Could not find command ${command} for device ${device.name}`
  );
};

module.exports = ({client, command, deviceName}) => {
  let {config: {device: devices}} = client;
  const device = _.find(devices, {name: deviceName});
  if (!device) throw new Error(`Harmony Device ${deviceName} not found`);

  const action = getAction({command, device}).replace(/:/g, '::');
  client.send('holdAction', `action=${action}:status=press`);
  client.send('holdAction', `action=${action}:status=release`);
};
