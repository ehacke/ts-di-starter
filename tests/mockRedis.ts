const redis = {
  duplicate: () => redis,
  createRedlock: () => ({ lock: async () => ({ unlock: async () => undefined }) }),
  defineCommand: () => null,
} as any;

export default redis;
