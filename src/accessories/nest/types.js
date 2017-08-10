const _ = require('underscore');

const {
  Accessory: {
    Categories: {
      SENSOR,
      THERMOSTAT
    }
  },
  Characteristic: {
    CarbonMonoxideDetected,
    CoolingThresholdTemperature,
    CurrentHeatingCoolingState,
    CurrentRelativeHumidity,
    CurrentTemperature,
    HeatingThresholdTemperature,
    MotionDetected,
    OccupancyDetected,
    SmokeDetected,
    TargetHeatingCoolingState,
    TargetTemperature,
    TemperatureDisplayUnits
  },
  Service: {
    CarbonMonoxideSensor,
    MotionSensor,
    OccupancySensor,
    SmokeSensor,
    Thermostat
  }
} = require('hap-nodejs');

const isDetected = ({
  device: {
    activity_zones,
    away,
    device_group,
    last_event,
    last_event: {activity_zone_ids, end_time} = {}
  },
  type,
  options: {activityZones}
}) =>
  device_group === 'structures' ?
  away === 'home' :
  last_event[`has_${type}`] &&
  !end_time && (
    !activityZones ||
    !_.isEmpty(_.intersection(
      activity_zone_ids,
      _.compact(_.map(activityZones, name =>
        (_.find(activity_zones, {name}) || {}) .id
      ))
    ))
  );

module.exports = {
  'carbon-monoxide-sensor': {
    category: SENSOR,
    Service: CarbonMonoxideSensor,
    characteristics: [
      {
        cid: CarbonMonoxideDetected,
        cname: 'carbon monoxide detected',
        toHap: ({device: {co_alarm_state}}) =>
          co_alarm_state === 'ok' ?
          CarbonMonoxideDetected.CO_LEVELS_NORMAL :
          CarbonMonoxideDetected.CO_LEVELS_ABNORMAL
      }
    ]
  },
  'smoke-sensor': {
    category: SENSOR,
    Service: SmokeSensor,
    characteristics: [
      {
        cid: SmokeDetected,
        cname: 'smoke detected',
        toHap: ({device: {co_alarm_state}}) =>
          co_alarm_state === 'ok' ?
          SmokeDetected.SMOKE_NOT_DETECTED :
          SmokeDetected.SMOKE_DETECTED
      }
    ]
  },
  'motion-sensor': {
    category: SENSOR,
    Service: MotionSensor,
    characteristics: [
      {
        cid: MotionDetected,
        cname: 'motion detected',
        toHap: ({device, options}) =>
          isDetected({device, type: 'motion', options})
      }
    ]
  },
  'occupancy-sensor': {
    category: SENSOR,
    Service: OccupancySensor,
    characteristics: [
      {
        cid: OccupancyDetected,
        cname: 'occupancy detected',
        toHap: ({device, options}) =>
          isDetected({device, key: 'person', options}) ?
          OccupancyDetected.OCCUPANCY_DETECTED :
          OccupancyDetected.OCCUPANCY_NOT_DETECTED
      }
    ]
  },
  thermostat: {
    category: THERMOSTAT,
    Service: Thermostat,
    characteristics: [
      {
        cid: CurrentHeatingCoolingState,
        cname: 'heating/cooling state',
        toHap: ({device: {hvac_state}}) => ({
          cooling: CurrentHeatingCoolingState.COOL,
          heating: CurrentHeatingCoolingState.HEAT,
          off: CurrentHeatingCoolingState.OFF
        })[hvac_state]
      },
      {
        cid: TargetHeatingCoolingState,
        cname: 'target heating/cooling state',
        toHap: ({device: {hvac_mode}}) => ({
          'heat-cool': TargetHeatingCoolingState.AUTO,
          cool: TargetHeatingCoolingState.COOL,
          eco: TargetHeatingCoolingState.OFF,
          heat: TargetHeatingCoolingState.HEAT,
          off: TargetHeatingCoolingState.OFF
        })[hvac_mode],
        toNest: state => ({
          hvac_mode: {
            [TargetHeatingCoolingState.AUTO]: 'heat-cool',
            [TargetHeatingCoolingState.COOL]: 'cool',
            [TargetHeatingCoolingState.HEAT]: 'heat',
            [TargetHeatingCoolingState.OFF]: 'off'
          }[state]
        })
      },
      {
        cid: CurrentTemperature,
        cname: 'temperature',
        toHap: ({device: {ambient_temperature_c}}) => ambient_temperature_c
      },
      {
        cid: TargetTemperature,
        cname: 'target temperature',
        toHap: ({device: {target_temperature_c}}) => target_temperature_c,
        toNest: ({
          device: {
            hvac_mode,
            target_temperature_high_c: high,
            target_temperature_low_c: low
          },
          value
        }) =>
          hvac_mode === 'heat-cool' ?
          Math.abs(low - value) < Math.abs(high - value) ?
          ({target_temperature_low_c: value}) :
          ({target_temperature_high_c: value}) :
          ({target_temperature_c: value})
      },
      {
        cid: CurrentRelativeHumidity,
        cname: 'humidity',
        toHap: ({device: {humidity}}) => humidity
      },
      {
        cid: CoolingThresholdTemperature,
        cname: 'cooling threshold',
        toHap: ({device: {target_temperature_high_c}}) =>
          target_temperature_high_c,
        toNest: ({value}) => ({target_temperature_high_c: value})
      },
      {
        cid: HeatingThresholdTemperature,
        cname: 'heating threshold',
        toHap: ({device: {target_temperature_low_c}}) =>
          target_temperature_low_c,
        toNest: ({value}) => ({target_temperature_low_c: value})
      },
      {
        cid: TemperatureDisplayUnits,
        cname: 'display unit',
        toHap: ({device: {temperature_scale}}) => ({
          C: TemperatureDisplayUnits.CELCIUS,
          F: TemperatureDisplayUnits.FAHRENHEIT
        })[temperature_scale],
        toNest: ({value}) => ({
          temperature_scale: {
            [TemperatureDisplayUnits.CELCIUS]: 'C',
            [TemperatureDisplayUnits.FAHRENHEIT]: 'F'
          }[value]
        })
      }
    ]
  }
};
