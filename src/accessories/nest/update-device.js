const _ = require('underscore');
const {parse} = require('url');
const fetch = require('node-fetch');

const TIMEOUT_WAIT = 1000;
const URL = 'https://developer-api.nest.com';

const urls = {};

const queue = {};

const createDeferred = () => {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

const put = async ({body, path, token}) => {
  return console.log(`Faking: PUT ${(urls[token] || URL) + path} ${JSON.stringify(body)}`);
  const res = await fetch((urls[token] || URL) + path, {
    body: JSON.stringify(body),
    follow: 0,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'PUT',
    redirect: 'manual'
  });

  const {headers, ok, status, statusText} = res;
  const location = headers.get('location');
  if (location) {
    const {host, protocol} = parse(location);
    urls[token] = `${protocol}//${host}`;
    return put({body, path, token});
  }

  if (!ok) throw new Error(`${status} ${statusText}: ${await res.text()}`);
};

module.exports = async ({body, device, token}) => {
  const {device_group, device_id} = device;
  const key = JSON.stringify([token, device_group, device_id]);
  let pending = queue[key];
  if (!pending) pending = queue[key] = {deferreds: []};
  const {deferreds} = [];
  const done = (key, er) =>
    _.each(deferreds, ({resolve, reject}) => er ? reject(er) : resolve());
  const deferred = createDeferred();
  pending.deferred.push(deferred);
  clearTimeout(pending.timeoutId);
  _.extend(pending, {body: _.extend({}, pending.body, body)});
  const current = _.pick(device, _.keys(pending.body));
  if (_.isEqual(current, pending.body)) {
    done();
  } else {
    pending.timeoutId = setTimeout(async () => {
      try {
        delete queue[key];
        await put({body, path: `/devices/${device_group}/${device_id}`, token});
        done();
      } catch (er) {
        done(er);
      }
    }, TIMEOUT_WAIT);
  }
  return deferred.promise;
};
