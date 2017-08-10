const _ = require('underscore');
const Base = require('../base');
const log = require('../../utils/log');
const types = require('./types');
const updateDevice = require('./update-device');
const watchDevice = require('./watch-device');

const DEBOUNCE_WAIT = 1000;

module.exports = class extends Base {
  constructor(options) {
    super(options);

    const {deviceName, name, token, type} = options;
    const {category, characteristics, Service} = types[type];
    let device;
    this.category = category;
    const service = new Service(name);
    _.each(characteristics, ({cid, cname, toHap, toNest}) => {
      const char = service.getCharacteristic(cid);

      char.on('change', ({oldValue, newValue}) =>
        log.info(`[${name}] ${cname}: ${oldValue} -> ${newValue}`)
      );

      if (toHap) {
        watchDevice({
          cb: _device => {
            device = _device;
            char.updateValue(toHap({device, options}));
          },
          deviceName,
          token
        });
      }

      if (toNest) {
        let cbs = [];
        const update = _.debounce(async value => {
          const done = er => {
            const _cbs = cbs;
            cbs = [];
            _.each(_cbs, cb => cb(er));
          };
          try {
            if (!device) throw new Error(`Nest Device ${deviceName} not found`);

            const body = toNest({device, options, value});
            await updateDevice({body, device, token});
            done();
          } catch (er) {
            log.error(er);
            done(er);
          }
        }, DEBOUNCE_WAIT);

        char.on('set', async (value, cb) => {
          cbs.push(cb);
          update(value);
        });
      }
    });

    this.addService(service);
  }
};
