const Base = require('../base');
const getActivity = require('./get-activity');
const getClient = require('./get-client');
const log = require('../../utils/log');
const sendCommand = require('./send-command');

const {
  Accessory: {Categories: {SWITCH}},
  Characteristic: {On},
  Service: {Switch}
} = require('hap-nodejs');

module.exports = class extends Base {
  constructor(options) {
    super(options);

    this.category = SWITCH;
    const {activityName, command, deviceName, hubName, name} = options;

    if (!activityName || !(deviceName && command)) {
      throw new Error(
        'Either `activityName` or (`deviceName` and `command`) are required'
      );
    }

    const service = new Switch(name);
    const characteristic = service.getCharacteristic(On);
    characteristic
      .on('change', ({oldValue, newValue}) =>
        log.info(`[${name}] on: ${oldValue} -> ${newValue}`)
      )
      .on('get', async cb => {
        cb(null, activityName ? characteristic.value : 0);

        try {
          if (activityName) {
            const client = await getClient(hubName);
            const {isOn} = await getActivity({activityName, client});
            characteristic.updateValue(isOn ? 1 : 0);
          }
        } catch (er) {
          log.error(er);
        }
      })
      .on('set', async (turnOn, cb) => {
        cb();

        try {
          const client = await getClient(hubName);
          if (activityName) {
            const {activity, isOn} = await getActivity({activityName, client});
            if (turnOn && !isOn) await client.startActivity(activity.id);
            else if (!turnOn && isOn) await client.turnOff();
          } else {
            if (turnOn) characteristic.updateValue(0);
            sendCommand({client, command, deviceName});
          }
        } catch (er) {
          log.error(er);
        }
      });

    this.addService(service);
  }
};
