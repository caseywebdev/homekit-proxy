const _ = require('underscore');
const Base = require('../base');
const getActivity = require('./get-activity');
const getClient = require('./get-client');
const log = require('../../utils/log');
const sendCommand = require('./send-command');
const sleep = require('../../utils/sleep');
const {
  Accessory: {
    Categories: { SWITCH }
  },
  Characteristic: { On },
  Service: { Switch }
} = require('hap-nodejs');

module.exports = class extends Base {
  constructor(options) {
    super(options);

    this.category = SWITCH;
    const { activityName, commands, deviceName, hubIp, name } = options;

    if (!activityName && !(deviceName && commands)) {
      throw new Error(
        'Either `activityName` or (`deviceName` and `commands`) are required'
      );
    }

    const service = new Switch(name);
    const characteristic = service.getCharacteristic(On);

    // This accessory should toggle an activity.
    if (activityName) {
      characteristic
        .on('change', ({ oldValue, newValue }) =>
          log.change(name, 'on', oldValue, newValue)
        )
        .on('get', async cb => {
          cb(null, characteristic.value);

          try {
            const client = await getClient({ hubIp });
            const { isOn } = await getActivity({ activityName, client });
            characteristic.updateValue(isOn ? 1 : 0);
          } catch (er) {
            log.error(er);
          }
        })
        .on('set', async (turnOn, cb) => {
          cb();

          try {
            const client = await getClient({ hubIp });
            const { activity, isOn } = await getActivity({
              activityName,
              client
            });
            if (turnOn && !isOn) await client.startActivity(activity.id);
            else if (!turnOn && isOn) await client.turnOff();
          } catch (er) {
            log.error(er);
          }
        });

      // This accessory should act as a command send button.
    } else {
      characteristic
        .on('get', cb => cb(null, 0))
        .on('set', async (__, cb) => {
          cb();

          try {
            log.event(name, 'pressed');
            setTimeout(() => characteristic.updateValue(0), 100);
            const client = await getClient({ hubIp });
            for (const command of commands) {
              if (_.isNumber(command)) await sleep(command);
              else await sendCommand({ client, command, deviceName });
            }
          } catch (er) {
            log.error(er);
          }
        });
    }

    this.addService(service);
  }
};
