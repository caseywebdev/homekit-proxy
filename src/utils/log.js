const {blue, cyan, green, grey, magenta, red, yellow} = require('chalk');

const DELIMITER = yellow('-');

const ARROW = grey(' -> ');

const pad = n => (n < 10 ? '0' : '') + n;

const getTimestamp = () => {
  const date = new Date();
  const d = date.toDateString();
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const amPm = h < 12 ? 'AM' : 'PM';
  return grey(`${d} ${pad(h % 12 || 12)}:${pad(m)}:${pad(s)} ${amPm}`);
};

const getPrefix = () => `${getTimestamp()} ${DELIMITER} `;

const getSubject = (name, cname) =>
  `${getPrefix()}${cyan(`[${name}]`)} ${magenta(cname)}`;

module.exports = {
  change: (name, cname, before, after) =>
    console.log(
      `${getSubject(name, cname)}: ${green(before)}${ARROW}${blue(after)}`
    ),
  error: str => console.error(getPrefix() + red(str)),
  event: (name, cname) => console.log(getSubject(name, cname))
};
