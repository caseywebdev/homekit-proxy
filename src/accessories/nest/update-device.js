const _ = require('underscore');
const {parse} = require('url');
const fetch = require('node-fetch');

const URL = 'https://developer-api.nest.com';

const urls = {};

const put = async ({body, token, url}) => {
  console.log(`PUT ${url} ${JSON.stringify(body)}`);
  const res = await fetch(url, {
    body: JSON.stringify(body),
    follow: 0,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'PUT',
    redirect: 'manual'
  });

  const location = res.headers.get('location');
  if (location) {
    const {host, protocol} = parse(location);
    urls[token] = `${protocol}//${host}`;
    return put({body, token, url: location});
  }

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }
};

module.exports = async ({body, device, token}) => {
  const current = _.pick(device, _.keys(body));
  if (_.isEqual(current, body)) return;

  const {device_group, device_id} = device;
  const url = `${urls[token] || URL}/devices/${device_group}/${device_id}`;
  return put({body, token, url});
};
