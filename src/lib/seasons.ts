export function getDefaultSeasonWindow(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const startsThisYear = referenceDate.getMonth() >= 6;
  const startYear = startsThisYear ? year : year - 1;
  const startsAt = new Date(startYear, 6, 1, 0, 0, 0, 0);
  const endsAt = new Date(startYear + 1, 5, 30, 23, 59, 59, 999);
  const name = `${startYear}/${String(startYear + 1).slice(-2)}`;

  return {
    name,
    startsAt,
    endsAt,
  };
}
