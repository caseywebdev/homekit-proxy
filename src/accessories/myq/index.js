const _ = require('underscore');
const Api = require('./api');
const BaseAccessory = require('../base');
const log = require('../../utils/log');

const {
  Accessory: {Categories: {GARAGE_DOOR_OPENER}},
  Characteristic: {CurrentDoorState, TargetDoorState},
  Service: {GarageDoorOpener}
} = require('hap-nodejs');

const ACTIVE_DELAY = 1000 * 2;
const IDLE_DELAY = 1000 * 10;

const API_TO_HAP = {
  0: CurrentDoorState.OPEN,
  1: CurrentDoorState.OPEN,
  2: CurrentDoorState.CLOSED,
  3: CurrentDoorState.OPEN,
  4: CurrentDoorState.OPENING,
  5: CurrentDoorState.CLOSING,
  9: CurrentDoorState.OPEN
};

const HAP_TO_API = {
  [TargetDoorState.OPEN]: 1,
  [TargetDoorState.CLOSED]: 0
};

const HAP_TO_ENGLISH = {
  [CurrentDoorState.OPEN]: 'open',
  [CurrentDoorState.CLOSED]: 'closed',
  [CurrentDoorState.OPENING]: 'opening',
  [CurrentDoorState.CLOSING]: 'closing'
};

const CURRENT_TO_TARGET = {
  [CurrentDoorState.OPEN]: TargetDoorState.OPEN,
  [CurrentDoorState.CLOSED]: TargetDoorState.CLOSED,
  [CurrentDoorState.OPENING]: TargetDoorState.OPEN,
  [CurrentDoorState.CLOSING]: TargetDoorState.CLOSED
};

module.exports = class extends BaseAccessory {
  constructor(options) {
    super(options);

    this.category = GARAGE_DOOR_OPENER;

    this.api = new Api(options);
    this.name = options.name;

    this.addService(this.service = new GarageDoorOpener(options.name));

    this.states = {
      doorstate:
        this.service
          .getCharacteristic(CurrentDoorState)
          .on('get', this.getCurrentDoorState.bind(this))
          .on('change', this.logChange.bind(this, 'doorstate')),
      desireddoorstate:
        this.service
          .getCharacteristic(TargetDoorState)
          .on('set', this.setTargetDoorState.bind(this))
          .on('change', this.logChange.bind(this, 'desireddoorstate'))
    };

    this.states.doorstate.value = CurrentDoorState.CLOSED;
    this.states.desireddoorstate.value = TargetDoorState.CLOSED;

    (this.poll = this.poll.bind(this))();
  }

  poll() {
    clearTimeout(this.pollTimeoutId);
    const {doorstate, desireddoorstate} = this.states;
    new Promise((resolve, reject) =>
      doorstate.getValue(er => er ? reject(er) : resolve())
    ).then(() =>
      doorstate.value !== desireddoorstate.value ? ACTIVE_DELAY : IDLE_DELAY
    ).catch(_.noop).then((delay = IDLE_DELAY) => {
      clearTimeout(this.pollTimeoutId);
      this.pollTimeoutId = setTimeout(this.poll, delay);
    });
  }

  logChange(name, {oldValue, newValue}) {
    const from = HAP_TO_ENGLISH[oldValue];
    const to = HAP_TO_ENGLISH[newValue];
    log.change(this.name, name, from, to);

    if (name === 'doorstate') {
      this.reactiveSetTargetDoorState = true;
      this.states.desireddoorstate.setValue(CURRENT_TO_TARGET[newValue]);
      delete this.reactiveSetTargetDoorState;
    }
  }

  getCurrentDoorState(cb) {
    cb(null, this.states.doorstate.value);

    this.api.getDeviceAttribute({name: 'doorstate'})
      .then(value => this.states.doorstate.updateValue(API_TO_HAP[value]))
      .catch(log.error);
  }

  setTargetDoorState(value, cb) {
    cb();

    if (this.reactiveSetTargetDoorState) return;

    value = HAP_TO_API[value];
    this.api.setDeviceAttribute({name: 'desireddoorstate', value})
      .then(() => this.poll())
      .catch(log.error);
  }
};
