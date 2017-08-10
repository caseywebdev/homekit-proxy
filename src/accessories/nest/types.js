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
  options: {activityZones},
  type
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

const toStep = (n, s) => Math.round(n / s) * s;

const toC = n => (n - 32) / 1.8;

const toF = n => (n * 1.8) + 32;

const toHapC = n => toStep(toC(n), 0.1);

const toNestF = n => Math.round(toF(n));

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
        toHap: ({device: {smoke_alarm_state}}) =>
          smoke_alarm_state === 'ok' ?
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
          isDetected({device, options, type: 'motion'})
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
          isDetected({device, options, type: 'person'}) ?
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
        toNest: ({value}) => ({
          hvac_mode: {
            [TargetHeatingCoolingState.AUTO]: 'heat-cool',
            [TargetHeatingCoolingState.COOL]: 'cool',
            [TargetHeatingCoolingState.HEAT]: 'heat',
            [TargetHeatingCoolingState.OFF]: 'off'
          }[value]
        })
      },
      {
        cid: CurrentTemperature,
        cname: 'temperature',
        toHap: ({device: {ambient_temperature_f}}) =>
          toHapC(ambient_temperature_f)
      },
      {
        cid: TargetTemperature,
        cname: 'target temperature',
        toHap: ({device: {target_temperature_f}}) =>
          toHapC(target_temperature_f),
        toNest: ({
          device: {
            hvac_mode,
            target_temperature_high_f: high,
            target_temperature_low_f: low
          },
          value
        }) => {
          value = toNestF(value);
          if (hvac_mode !== 'heat-cool') return {target_temperature_f: value};

          return (
            Math.abs(low - value) < Math.abs(high - value) ?
            {target_temperature_low_f: value} :
            {target_temperature_high_f: value}
          );
        }
      },
      {
        cid: CurrentRelativeHumidity,
        cname: 'humidity',
        toHap: ({device: {humidity}}) => humidity
      },
      {
        cid: CoolingThresholdTemperature,
        cname: 'cooling threshold',
        toHap: ({device: {target_temperature_high_f}}) =>
          toHapC(target_temperature_high_f),
        toNest: ({value}) => ({target_temperature_high_f: toNestF(value)})
      },
      {
        cid: HeatingThresholdTemperature,
        cname: 'heating threshold',
        toHap: ({device: {target_temperature_low_f}}) =>
          toHapC(target_temperature_low_f),
        toNest: ({value}) => ({target_temperature_low_f: toNestF(value)})
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
