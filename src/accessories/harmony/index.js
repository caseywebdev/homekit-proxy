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

    const getActivity = async client => {
      const activity = _.find(await client.getActivities(), {label});
      if (!activity) throw new Error(`Harmony Activity ${label} not found`);

      return activity;
    };

    const service = new Switch(name);

    service
      .getCharacteristic(On)
      .on('change', ({oldValue, newValue}) =>
        console.log(`[${name}] on: ${oldValue} -> ${newValue}`)
      )
      .on('get', async cb => {
        try {
          const client = await getClient(hubName);
          const activity = await getActivity(client);
          const activityId = await client.getCurrentActivity();
          await client.end();
          cb(null, activity.id === activityId);
        } catch (er) {
          console.error(er);
          cb(er);
        }
      })
      .on('set', async (value, cb) => {
        try {
          const client = await getClient(hubName);
          if (value) {
            const activity = await getActivity(client);
            client.startActivity(activity.id).catch(er => console.error(er));
          } else {
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
