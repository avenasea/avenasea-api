export const getLastSunday = (d: Date) => {
  const t = new Date(d);

  t.setDate(t.getDate() - (t.getDay() || 7));

  return t;
};
