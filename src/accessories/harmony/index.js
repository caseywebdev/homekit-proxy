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
      if (!activities) activities = client.activities = client.getActivities();
      const activity = _.find(await activities, {label});
      if (!activity) throw new Error(`Harmony Activity ${label} not found`);

      const isOn = activity.id === await client.getCurrentActivity();
      return {activity, client, isOn};
    };

    const service = new Switch(name);

    service
      .getCharacteristic(On)
      .on('change', ({oldValue, newValue}) =>
        log.info(`[${name}] on: ${oldValue} -> ${newValue}`)
      )
      .on('get', async cb => {
        try {
          cb(null, (await getState()).isOn);
        } catch (er) {
          log.error(er);
          cb(er);
        }
      })
      .on('set', async (turnOn, cb) => {
        try {
          const {activity, client, isOn} = await getState();
          if (turnOn && !isOn) {
            client.startActivity(activity.id).catch(er => log.error(er));
          } else if (!turnOn && isOn) {
            client.turnOff().catch(er => log.error(er));
          }
          cb();
        } catch (er) {
          log.error(er);
          cb(er);
        }
      });

    this.addService(service);
  }
};
