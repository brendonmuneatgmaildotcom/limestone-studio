const compactDate = (value) => value.slice(0, 10).replaceAll("-", "");

const utcTimestamp = (date) =>
  date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");

export function createBookingCalendar(bookings, generatedAt = new Date()) {
  const events = bookings.flatMap((booking) => {
    if (!booking?.id || !booking?.start_date || !booking?.end_date) return [];

    return [
      "BEGIN:VEVENT",
      `UID:${String(booking.id).replaceAll(/[^a-zA-Z0-9_-]/g, "-")}@limestonestudio.co.nz`,
      `DTSTAMP:${utcTimestamp(generatedAt)}`,
      `DTSTART;VALUE=DATE:${compactDate(booking.start_date)}`,
      `DTEND;VALUE=DATE:${compactDate(booking.end_date)}`,
      "SUMMARY:Reserved - Limestone Studio",
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ];
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Limestone Studio//Direct Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Limestone Studio Direct Bookings",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
