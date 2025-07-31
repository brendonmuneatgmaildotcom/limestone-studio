// /api/bookingcom.js

export default async function handler(req, res) {
  const icalUrl = "https://ical.booking.com/v1/export?t=e30eb621-32d5-454e-a0cb-c6acbdff90bf";

  try {
    const icalRes = await fetch(icalUrl);
    const text = await icalRes.text();

    res.setHeader("Content-Type", "text/calendar");
    res.setHeader("Cache-Control", "max-age=0, s-maxage=60");
    res.status(200).send(text);
  } catch (error) {
    console.error("Error fetching iCal:", error);
    res.status(500).json({ error: "Failed to fetch iCal feed" });
  }
}
