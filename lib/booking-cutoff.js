const AUCKLAND_TIME_ZONE = "Pacific/Auckland";

const getParts = (date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-NZ", {
      timeZone: AUCKLAND_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

const addOneDay = (ymd) => {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
};

export function getBookingCutoff(now = new Date()) {
  const parts = getParts(now);
  const todayYMD = `${parts.year}-${parts.month}-${parts.day}`;
  const sameDayClosed = Number(parts.hour) >= 11;

  return {
    todayYMD,
    sameDayClosed,
    earliestBookableYMD: sameDayClosed ? addOneDay(todayYMD) : todayYMD,
  };
}
