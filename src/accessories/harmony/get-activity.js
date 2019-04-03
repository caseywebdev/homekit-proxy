const _ = require('underscore');

module.exports = async ({ activityName, client }) => {
  const {
    config: { activity: activities }
  } = client;
  const activity = _.find(activities, { label: activityName });
  if (!activity) throw new Error(`Harmony Activity ${activityName} not found`);

  const currentActivity = await client.getCurrentActivity();
  const isOn = activity.id === currentActivity;
  return { activity, isOn };
};
