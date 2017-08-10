const _ = require('underscore');
const {parse} = require('url');
const fetch = require('node-fetch');

const URL = 'https://developer-api.nest.com';

const urls = {};

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
  const current = _.pick(device, _.keys(body));
  if (_.isEqual(current, body)) return;

  const {device_group, device_id} = device;
  return put({body, path: `/devices/${device_group}/${device_id}`, token});
};
