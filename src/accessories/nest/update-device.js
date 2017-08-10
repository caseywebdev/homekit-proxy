const fetch = require('node-fetch');
const url = require('url');

const URL = 'https://developer-api.nest.com';

const urls = {};

const put = async ({body, path, token}) => {
  console.log(
    `PUT ${(urls[token] || URL) + path} ${JSON.stringify(body)}`
  );
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

  const location = res.headers.get('location');
  if (location) {
    const {host, protocol} = url.parse(location);
    urls[token] = `${protocol}//${host}`;
    return put({body, path, token});
  }

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }
};

module.exports = async ({body, device: {device_group, device_id}, token}) =>
  put({body, path: `/devices/${device_group}/${device_id}`, token});
