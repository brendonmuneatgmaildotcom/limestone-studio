const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseYMD = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatYMD = (date) => date.toISOString().slice(0, 10);

export function calculateNightlyRate(dateValue, guests) {
  const date = parseYMD(dateValue);
  if (!date || ![1, 2].includes(guests)) throw new Error("Invalid pricing input");

  const month = date.getUTCMonth() + 1;
  const dayOfMonth = date.getUTCDate();
  const dayOfWeek = date.getUTCDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
  const isSummer = month === 12 || month === 1 || month === 2;

  let baseRate;
  if (isSummer) {
    baseRate = guests === 1 ? (isWeekend ? 165 : 155) : (isWeekend ? 180 : 170);
  } else {
    baseRate = guests === 1 ? (isWeekend ? 145 : 135) : (isWeekend ? 160 : 150);
  }

  const christmasPremium =
    (month === 12 && dayOfMonth >= 15) || (month === 1 && dayOfMonth <= 30) ? 30 : 0;
  const peakPremium =
    (month === 12 && dayOfMonth >= 22) || (month === 1 && dayOfMonth <= 5) ? 40 : 0;

  return {
    date: dateValue,
    baseRate,
    christmasPremium,
    peakPremium,
    total: baseRate + christmasPremium + peakPremium,
  };
}

export function calculateStayPrice(startDate, endDate, guests, nonRefundable = false) {
  const start = parseYMD(startDate);
  const end = parseYMD(endDate);
  if (!start || !end || end <= start || ![1, 2].includes(guests)) {
    throw new Error("Invalid stay details");
  }

  const breakdown = [];
  for (let cursor = start; cursor < end; cursor = new Date(cursor.getTime() + MS_PER_DAY)) {
    breakdown.push(calculateNightlyRate(formatYMD(cursor), guests));
  }

  const subtotalNZD = breakdown.reduce((sum, night) => sum + night.total, 0);
  const nonRefundableDiscountNZD = nonRefundable ? Math.round(subtotalNZD * 10) / 100 : 0;
  const longStayDiscountNZD = breakdown.length >= 6 ? Math.round(subtotalNZD * 10) / 100 : 0;
  const discountNZD = nonRefundableDiscountNZD + longStayDiscountNZD;

  return {
    nights: breakdown.length,
    subtotalNZD,
    nonRefundableDiscountNZD,
    longStayDiscountNZD,
    discountNZD,
    amountNZD: subtotalNZD - discountNZD,
    breakdown,
  };
}
