const Base = require('../base');
const getZwave = require('../zwave/get-zwave');
const log = require('../../utils/log');
const rpio = require('rpio');
const sleep = require('../../utils/sleep');

const {
  Accessory: {Categories: {GARAGE_DOOR_OPENER}},
  Characteristic: {CurrentDoorState, TargetDoorState},
  Service: {GarageDoorOpener}
} = require('hap-nodejs');

// 0x00 is off (closed), 0xff is on (open).
const BINARY_SENSOR_CLASS_ID = 0x30;

// The longest amount of time it should take the door to open or close.
const MAX_TRANSITION_TIME = 20;

const TO_HAP = {
  [false]: CurrentDoorState.CLOSED,
  [true]: CurrentDoorState.OPEN
};

const TO_ENGLISH = {
  [CurrentDoorState.OPEN]: 'open',
  [CurrentDoorState.CLOSED]: 'closed',
  [CurrentDoorState.OPENING]: 'opening',
  [CurrentDoorState.CLOSING]: 'closing'
};

module.exports = class extends Base {
  constructor(options) {
    super(options);

    this.category = GARAGE_DOOR_OPENER;

    const {gpioPinId, name, zwaveNodeId} = options;
    const service = new GarageDoorOpener(name);

    const {client, refreshValue, values} = getZwave(options);
    const current = service.getCharacteristic(CurrentDoorState);
    const target = service.getCharacteristic(TargetDoorState);
    let transitionTimeoutId;
    const key = [zwaveNodeId, BINARY_SENSOR_CLASS_ID, 1, 0].join('-');
    const currentValue = values[key] || false;
    current.on('change', ({oldValue, newValue}) => {
      log.change(name,
        'Current Door State',
        TO_ENGLISH[oldValue],
        TO_ENGLISH[newValue]
      );

      target.updateValue(current.value);
    });

    if (currentValue != null) current.updateValue(TO_HAP[currentValue]);

    client.on(`value:${key}`, value => current.updateValue(TO_HAP[value]));

    current.on('get', cb => {
      cb(null, current.value);

      refreshValue(key);
    });

    // Set up TargetDoorState characteristic, handled by sending a gpio signal.
    target.on('change', ({oldValue, newValue}) =>
      log.change(
        name,
        'Target Door State',
        TO_ENGLISH[oldValue],
        TO_ENGLISH[newValue]
      )
    );

    rpio.open(gpioPinId, rpio.OUTPUT, rpio.HIGH);

    target.on('set', async (value, cb) => {
      cb();

      // After MAX_TRANSITION_TIME has passed, automatically set the target
      // state to whatever the current state is. This will ensure the door isn't
      // in a permanent "opening" or "closing" state.
      clearTimeout(transitionTimeoutId);
      transitionTimeoutId = setTimeout(
        () => target.updateValue(current.value),
        MAX_TRANSITION_TIME * 1000
      );

      try {
        rpio.write(gpioPinId, rpio.LOW);
        await sleep(0.5);
        rpio.write(gpioPinId, rpio.HIGH);
      } catch (er) {
        log.error(er);
      }
    });

    this.addService(service);
  }
};
