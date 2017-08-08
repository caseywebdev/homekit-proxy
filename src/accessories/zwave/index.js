const _ = require('underscore');
const Base = require('../base');
const getZwave = require('./get-zwave');
const types = require('./types');

module.exports = class extends Base {
  constructor(options) {
    super(options);

    const {client, values} = getZwave(options);
    const {name, nodeId, type} = options;
    const {Service, characteristics} = types[type];
    const service = new Service(name);
    _.each(characteristics, ({
      cid,
      cname,
      commandClass,
      index = 0,
      instance = 1,
      isTarget = false,
      hasTarget = false
    }) => {
      const char = service.getCharacteristic(cid);
      char.on('change', ({oldValue, newValue}) =>
        console.log(`${name} ${cname} changed from ${oldValue} to ${newValue}`)
      );

      const key = [nodeId, commandClass, instance, index].join('-');
      char.updateValue(values[key]);

      if (!isTarget) {
        char.on('get', cb => {
          try {
            client.refreshValue(nodeId, commandClass, instance, index);
            cb(null, values[key]);
          } catch (er) {
            cb(er);
          }
        });

        client.on(`value:${key}`, ({value}) => char.updateValue(value));
      }

      if (!hasTarget) {
        char.on('set', (value, cb) => {
          try {
            client.setValue(nodeId, commandClass, instance, index, value);
            cb();
          } catch (er) {
            cb(er);
          }
        });
      }
    });

    this.addService(service);
  }
};
