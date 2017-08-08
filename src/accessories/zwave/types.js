const {
  Characteristic: {
    BatteryLevel,
    Brightness,
    On,
    RotationSpeed,
    LockTargetState,
    LockCurrentState
  },
  Service: {
    BatteryService,
    Fan,
    Lightbulb,
    LockMechanism
  }
} = require('hap-nodejs');

module.exports = {
  'multilevel-fan': {
    Service: Fan,
    characteristics: [
      {
        cid: On,
        cname: 'power',
        classId: 0x26,
        toHap: n => n ? 1 : 0,
        toZwave: n => n ? 99 : 0
      },
      {
        cid: RotationSpeed,
        cname: 'speed',
        classId: 0x26,
        toHap: n => Math.floor(n / 99 * 100),
        toZwave: n => Math.ceil(n / 100 * 99)
      }
    ]
  },
  'binary-light': {
    Service: Lightbulb,
    characteristics: [
      {
        cid: On,
        cname: 'power',
        classId: 0x25,
        toHap: n => n ? 1 : 0,
        toZwave: n => !!n
      }
    ]
  },
  'multilevel-light': {
    Service: Lightbulb,
    characteristics: [
      {
        cid: On,
        cname: 'power',
        classId: 0x26,
        toHap: n => n ? 1 : 0,
        toZwave: n => n ? 99 : 0
      },
      {
        cid: Brightness,
        cname: 'brightness',
        classId: 0x26,
        toHap: n => Math.floor(n / 99 * 100),
        toZwave: n => Math.ceil(n / 100 * 99)
      }
    ]
  },
  lock: {
    Service: LockMechanism,
    characteristics: [
      {
        cid: LockCurrentState,
        cname: 'state',
        classId: 0x62,
        hasTarget: true,
        toHap: n => n ? LockTargetState.SECURED : LockTargetState.UNSECURED,
        toZwave: n => n === LockTargetState.SECURED ? true : false
      },
      {
        cid: LockTargetState,
        cname: 'target state',
        classId: 0x62,
        isTarget: true,
        toHap: n => n ? LockTargetState.SECURED : LockTargetState.UNSECURED,
        toZwave: n => n === LockTargetState.SECURED ? true : false
      }
    ]
  },
  battery: {
    Service: BatteryService,
    characteristics: [
      {
        cid: BatteryLevel,
        cname: 'level',
        classId: 0x80
      }
    ]
  }
};
