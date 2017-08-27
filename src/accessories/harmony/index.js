const _ = require('underscore');
const Base = require('../base');
const getClient = require('./get-client');
const log = require('../../utils/log');

const {
  Accessory: {Categories: {SWITCH}},
  Characteristic: {On},
  Service: {Switch}
} = require('hap-nodejs');

module.exports = class extends Base {
  constructor(options) {
    super(options);

    this.category = SWITCH;
    const {activityName: label, hubName, name} = options;

    const getState = async () => {
      const client = await getClient(hubName);
      let {activities} = client;
      if (!activities) {
        activities = client.activities = await client.getActivities();
      }
      const activity = _.find(activities, {label});
      if (!activity) throw new Error(`Harmony Activity ${label} not found`);

      const currentActivity = await client.getCurrentActivity();
      const isOn = activity.id === currentActivity;
      return {activity, client, isOn};
    };

    const service = new Switch(name);
    const characteristic = service.getCharacteristic(On);
    characteristic
      .on('change', ({oldValue, newValue}) =>
        log.info(`[${name}] on: ${oldValue} -> ${newValue}`)
      )
      .on('get', async cb => {
        cb(null, characteristic.value);

        try {
          const {isOn} = await getState();
          characteristic.updateValue(isOn);
        } catch (er) {
          log.error(er);
        }
      })
      .on('set', async (turnOn, cb) => {
        cb();

        try {
          const {activity, client, isOn} = await getState();
          if (turnOn && !isOn) await client.startActivity(activity.id);
          else if (!turnOn && isOn) await client.turnOff();
        } catch (er) {
          log.error(er);
        }
      });

    this.addService(service);
  }
};
