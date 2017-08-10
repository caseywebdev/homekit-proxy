const fetch = require('node-fetch');

const DEVICES_URL = 'https://developer-api.nest.com/devices';

const put = async ({body, token, url}) => {
  const res = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer: ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'PUT'
  });

  if (res.status === 307) {
    return put({body, token, url: res.headers.get('location')});
  }

  if (!res.ok) throw new Error(await res.text());
};

module.exports = async ({body, device: {device_group, device_id}, token}) =>
  put({body, token, url: `${DEVICES_URL}/${device_group}/${device_id}`});
