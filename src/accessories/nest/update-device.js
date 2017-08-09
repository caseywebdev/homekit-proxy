const fetch = require('node-fetch');

const DEVICES_URL = 'https://developer-api.nest.com/devices';

module.exports = async ({body, device: {device_group, device_id}, token}) => {
  const res = await fetch(`${DEVICES_URL}/${device_group}/${device_id}`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer: ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'PUT'
  });
  if (!res.ok) throw new Error(await res.text());
};
