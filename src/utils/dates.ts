export const getLastSunday = (d) => {
  const t = new Date(d);

  t.setDate(t.getDate() - (t.getDay() || 7));

  return t;
};
