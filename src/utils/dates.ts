export const getLastSunday = (d: Date) => {
  const t = new Date(d);

  t.setDate(t.getDate() - (t.getDay() || 7));

  return t;
};

export const getOneWeekAgo = (d: Date) => {
  const t = new Date(d);

  t.setDate(t.getDate() - 7);

  return t;
}