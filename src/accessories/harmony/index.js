const _ = require('underscore');
const Base = require('../base');
const getClient = require('./get-client');
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
      const activity = _.find(await client.getActivities(), {label});
      if (!activity) throw new Error(`Harmony Activity ${label} not found`);

      const isOn = activity.id === await client.getCurrentActivity();
      return {activity, client, isOn};
    };

    const service = new Switch(name);

    service
      .getCharacteristic(On)
      .on('change', ({oldValue, newValue}) =>
        console.log(`[${name}] on: ${oldValue} -> ${newValue}`)
      )
      .on('get', async cb => {
        try {
          const {client, isOn} = await getState();
          await client.end();
          cb(null, isOn);
        } catch (er) {
          console.error(er);
          cb(er);
        }
      })
      .on('set', async (turnOn, cb) => {
        try {
          const {activity, client, isOn} = await getState();
          if (turnOn && !isOn) {
            client.startActivity(activity.id).catch(er => console.error(er));
          } else if (!turnOn && isOn) {
            client.turnOff().catch(er => console.error(er));
          }
          await client.end();
          cb();
        } catch (er) {
          console.error(er);
          cb(er);
        }
      });

    this.addService(service);
  }
};
