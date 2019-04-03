const _ = require('underscore');
const log = require('../../utils/log');
const OZW = require('openzwave-shared');

const CHECK_INTERVAL = 1000;
const DEBOUNCE_WAIT = 100;
const MAX_CHECK_WAIT = 15000;

const byDevice = {};

module.exports = ({ device, networkKey: NetworkKey }) => {
  const zwave = byDevice[device];
  if (zwave) return zwave;

  const client = new OZW({
    Logging: false,
    LogInitialisation: false,
    NetworkKey
  });
  const ready = {};
  const values = {};
  const pending = {};

  const emitValue = (key, value) => {
    if (value === values[key]) return;

    values[key] = value;
    client.emit(`value:${key}`, value);
  };

  const handleNode = nodeId => {
    ready[nodeId] = true;
    _.each(pending[nodeId], (value, key) => emitValue(key, value));
  };

  const handleValue = (nodeId, classId, { index, instance, value }) => {
    const key = [nodeId, classId, instance, index].join('-');
    if (ready[nodeId]) return emitValue(key, value);

    (pending[nodeId] || (pending[nodeId] = {}))[key] = value;
  };

  const getValueId = key => {
    const n = _.map(key.split('-'), n => parseInt(n));
    return { node_id: n[0], class_id: n[1], instance: n[2], index: n[3] };
  };

  const getValueSetter = _.memoize(key => {
    let handler = _.noop;
    let checkTimeoutId;
    const event = `value:${key}`;
    return _.debounce(value => {
      const done = _.once(er => {
        client.removeListener(event, handler);
        clearTimeout(checkTimeoutId);
        if (er) log.error(er);
      });

      client.removeListener(event, handler);
      handler = _value => {
        if (_value === value) done();
      };
      client.on(event, handler);

      const start = Date.now();
      const check = () => {
        if (values[key] === value) return done();

        if (Date.now() - start > MAX_CHECK_WAIT) {
          return done(
            new Error(
              `Waited over ${MAX_CHECK_WAIT / 1000}s for ${key} to be set to ` +
                `${value}, but it is currently ${values[key]}.`
            )
          );
        }

        refreshValue(key);

        clearTimeout(checkTimeoutId);
        checkTimeoutId = setTimeout(check, CHECK_INTERVAL);
      };

      try {
        client.setValue(getValueId(key), value);
      } catch (er) {
        return done(er);
      }

      clearTimeout(checkTimeoutId);
      checkTimeoutId = setTimeout(check, CHECK_INTERVAL);
    }, DEBOUNCE_WAIT);
  });

  const setValue = (key, value) => getValueSetter(key)(value);

  const getValueRefresher = _.memoize(key =>
    _.debounce(() => {
      try {
        client.refreshValue(getValueId(key));
      } catch (er) {
        log.error(er);
      }
    }, DEBOUNCE_WAIT)
  );

  const refreshValue = key => getValueRefresher(key)();

  client
    .on('node ready', handleNode)
    .on('value added', handleValue)
    .on('value changed', handleValue)
    .connect(device);
  return (byDevice[device] = { client, refreshValue, setValue, values });
};

process.on('SIGTERM', () => {
  _.each(byDevice, ({ client }, device) => client.disconnect(device));
});
