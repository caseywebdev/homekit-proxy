const _ = require('underscore');
const { accessories, includes, pincode, port = 10000 } = require('../config');
const { init, uuid } = require('hap-nodejs');
const path = require('path');

init(path.resolve('persist'));

const toUsername = name =>
  _.chain(uuid.generate(name).replace(/-/g, ''))
    .groupBy((_, i) => Math.floor(i / 2))
    .invoke('join', '')
    .values()
    .slice(0, 6)
    .join(':')
    .value()
    .toUpperCase();

_.each(_.pairs(accessories), ([name, typeOptions], i) => {
  const [type, options] = _.pairs(typeOptions)[0];
  const { salt = '' } = options;
  const Accessory = require(`./accessories/${type}`);
  const accessory = new Accessory(
    _.extend(
      _.reduce(
        options.$include,
        (obj, key) => _.extend(obj, includes[key]),
        {}
      ),
      _.omit(options, '$include'),
      { name }
    )
  );
  accessory.publish({
    category: accessory.category,
    pincode,
    port: port + i,
    username: toUsername(name + salt)
  });
});
