export type UUID = string;

export const getRandomId = (): UUID => {
  return crypto.randomUUID() as UUID;
};
