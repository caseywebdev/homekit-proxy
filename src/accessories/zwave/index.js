const _ = require('underscore');
const Base = require('../base');
const getZwave = require('./get-zwave');
const types = require('./types');

module.exports = class extends Base {
  constructor(options) {
    super(options);

    const {client, nodes} = getZwave(options);
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

      const getValue = () =>
        nodes[nodeId] &&
        nodes[nodeId].classes &&
        nodes[nodeId].classes[commandClass] &&
        nodes[nodeId].classes[commandClass][index] &&
        nodes[nodeId].classes[commandClass][index].value;

      char.updateValue(getValue());

      if (!isTarget) {
        char.on('get', cb => {
          client.refreshValue(nodeId, commandClass, instance, index);
          cb(null, getValue());
        });

        client.on(`${nodeId}:${commandClass}:${index}:value`, ({value}) => {
          char.updateValue(value);
        });
      }

      if (!hasTarget) {
        char.on('set', (value, cb) => {
          client.setValue(nodeId, commandClass, instance, index, value);
          cb();
        });
      }
    });

    this.addService(service);
  }
};
