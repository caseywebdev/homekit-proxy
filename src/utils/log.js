const pad = n => (n < 10 ? '0' : '') + n;

const getTimestamp = () => {
  const date = new Date();
  const d = date.toDateString();
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const amPm = h < 12 ? 'AM' : 'PM';
  return `${d} ${pad(h % 12 || 12)}:${pad(m)}:${pad(s)} ${amPm}`;
};

module.exports = {
  error: str => console.error(`${getTimestamp()} - ${str}`),
  info: str => console.log(`${getTimestamp()} - ${str}`)
};
