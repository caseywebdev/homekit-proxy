const fetch = require('node-fetch');

const URL = 'https://developer-api.nest.com';

module.exports = async ({body, device: {device_group, device_id}, token}) => {
  const res = await fetch(`${URL}/devices/${device_group}/${device_id}`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'PUT'
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }
};
