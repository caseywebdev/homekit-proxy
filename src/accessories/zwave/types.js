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
  fan: {
    Service: Fan,
    characteristics: [
      {
        cid: On,
        cname: 'power',
        commandClass: 37
      },
      {
        cid: RotationSpeed,
        cname: 'speed',
        commandClass: 38
      }
    ]
  },
  light: {
    Service: Lightbulb,
    characteristics: [
      {
        cid: On,
        cname: 'power',
        commandClass: 0x25
      }
    ]
  },
  dimmableLight: {
    Service: Lightbulb,
    characteristics: [
      {
        cid: On,
        cname: 'power',
        commandClass: 0x25
      },
      {
        cid: Brightness,
        cname: 'brightness',
        commandClass: 0x26
      }
    ]
  },
  lock: {
    Service: LockMechanism,
    characteristics: [
      {
        cid: LockCurrentState,
        cname: 'state',
        commandClass: 0x76,
        hasTarget: true
      },
      {
        cid: LockTargetState,
        cname: 'target state',
        commandClass: 0x76,
        isTarget: true
      }
    ]
  },
  battery: {
    Service: BatteryService,
    characteristics: [
      {
        cid: BatteryLevel,
        cname: 'level',
        commandClass: 0x80
      }
    ]
  }
};
