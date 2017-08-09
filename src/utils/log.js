const getTimestamp = () => {
  const date = new Date();
  let time = date.toLocaleTimeString();
  if (time.length < 11) time = `0${time}`;
  return `${date.toDateString()} ${time}`;
};

module.exports = {
  error: str => console.error(`${getTimestamp()} - ${str}`),
  info: str => console.log(`${getTimestamp()} - ${str}`)
};
