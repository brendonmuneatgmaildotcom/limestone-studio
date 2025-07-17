export async function GET() {
  const icalUrl = "https://ical.booking.com/v1/export?t=e30eb621-32d5-454e-a0cb-c6acbdff90bf";
  const res = await fetch(icalUrl);
  const text = await res.text();

  return new Response(text, {
    headers: {
      "Content-Type": "text/calendar",
      "Cache-Control": "max-age=0, s-maxage=60",
    },
  });
}
