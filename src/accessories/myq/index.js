const _ = require('underscore');
const {
  Characteristic: {CurrentDoorState, TargetDoorState},
  Service: {GarageDoorOpener}
} = require('hap-nodejs');
const Api = require('./api');
const BaseAccessory = require('../base');

const ACTIVE_DELAY = 1000 * 2;
const IDLE_DELAY = 1000 * 10;

module.exports = class extends BaseAccessory {
  constructor(options) {
    super(options);

    this.category = BaseAccessory.Categories.GARAGE_DOOR_OPENER;

    this.api = new Api(options);
    this.name = options.name;

    this.apiToHap = {
      1: CurrentDoorState.OPEN,
      2: CurrentDoorState.CLOSED,
      4: CurrentDoorState.OPENING,
      5: CurrentDoorState.CLOSING
    };

    this.hapToApi = {
      [TargetDoorState.OPEN]: 1,
      [TargetDoorState.CLOSED]: 0
    };

    this.hapToEnglish = {
      [CurrentDoorState.OPEN]: 'open',
      [CurrentDoorState.CLOSED]: 'closed',
      [CurrentDoorState.OPENING]: 'opening',
      [CurrentDoorState.CLOSING]: 'closing'
    };

    this.currentToTarget = {
      [CurrentDoorState.OPEN]: TargetDoorState.OPEN,
      [CurrentDoorState.CLOSED]: TargetDoorState.CLOSED,
      [CurrentDoorState.OPENING]: TargetDoorState.OPEN,
      [CurrentDoorState.CLOSING]: TargetDoorState.CLOSED
    };

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
    return new Promise((resolve, reject) =>
      doorstate.getValue(er => er ? reject(er) : resolve())
    ).then(() =>
      doorstate.value !== desireddoorstate.value ? ACTIVE_DELAY : IDLE_DELAY
    ).catch(_.noop).then((delay = IDLE_DELAY) => {
      clearTimeout(this.pollTimeoutId);
      this.pollTimeoutId = setTimeout(this.poll, delay);
    });
  }

  logChange(name, {oldValue, newValue}) {
    const from = this.hapToEnglish[oldValue];
    const to = this.hapToEnglish[newValue];
    console.log(`[${this.name}] ${name}: ${from} -> ${to}`);

    if (name === 'doorstate') {
      this.reactiveSetTargetDoorState = true;
      this.states.desireddoorstate.setValue(this.currentToTarget[newValue]);
      delete this.reactiveSetTargetDoorState;
    }
  }

  getErrorHandler(cb) {
    return er => {
      console.error(er);
      cb(er);
    };
  }

  getCurrentDoorState(cb) {
    return this.api.getDeviceAttribute({name: 'doorstate'})
      .then(value => cb(null, this.apiToHap[value]))
      .catch(this.getErrorHandler(cb));
  }

  setTargetDoorState(value, cb) {
    if (this.reactiveSetTargetDoorState) return cb();

    value = this.hapToApi[value];
    return this.api.setDeviceAttribute({name: 'desireddoorstate', value})
      .then(() => {
        this.poll();
        cb();
      })
      .catch(this.getErrorHandler(cb));
  }
};
