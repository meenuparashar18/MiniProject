const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);

const isLocalMongoUrl = (value) =>
  /(^mongodb(?:\+srv)?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(value);

const getMongoConfig = () => {
  const candidates = [
    ['MONGO_URI', process.env.MONGO_URI],
    ['MONGODB_URI', process.env.MONGODB_URI],
    ['MONGO_URL', process.env.MONGO_URL],
    ['DATABASE_URL', process.env.DATABASE_URL],
  ]
    .map(([name, value]) => [name, value && value.trim()])
    .filter(([, value]) => Boolean(value));

  const selected =
    candidates.find(([, value]) => isRailway && !isLocalMongoUrl(value)) ||
    candidates.find(([, value]) => !isLocalMongoUrl(value)) ||
    candidates[0];

  return {
    isRailway,
    isLocalMongoUrl,
    uri: selected?.[1] || '',
    source: selected?.[0] || '',
  };
};

module.exports = {
  getMongoConfig,
};
