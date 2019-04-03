const { Accessory, uuid } = require('hap-nodejs');

module.exports = class extends Accessory {
  constructor({ name }) {
    super(name, uuid.generate(name));
  }
};
