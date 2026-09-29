const NOTIFICATION_EMAIL = "brendonmune@gmail.com";

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

export async function sendBookingNotification(session) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Booking notification skipped: RESEND_API_KEY is not configured");
    return { skipped: true };
  }

  const { name, email, startDate, endDate, guests, nights, amountNZD, nonRefundable } =
    session.metadata || {};
  const isNonRefundable = nonRefundable === "true";
  const guestCount = Number(guests || 1);
  const amount = Number(amountNZD || 0).toFixed(2);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `limestone-booking-${session.id}`,
    },
    body: JSON.stringify({
      from: process.env.BOOKING_FROM_EMAIL || "Limestone Studio <onboarding@resend.dev>",
      to: [process.env.BOOKING_NOTIFICATION_EMAIL || NOTIFICATION_EMAIL],
      reply_to: email,
      subject: `New Limestone Studio booking: ${formatDate(startDate)}`,
      text: [
        "A new Limestone Studio booking has been paid.",
        "",
        `Guest: ${name}`,
        `Email: ${email}`,
        `Arrival: ${formatDate(startDate)}`,
        `Checkout: ${formatDate(endDate)}`,
        `Nights: ${nights}`,
        `Guests: ${guestCount}`,
        `Terms: ${isNonRefundable ? "Non-refundable (10% discount applied)" : "Refundable until 24 hours before check-in"}`,
        `Amount paid: $${amount} NZD`,
        `Stripe reference: ${session.id}`,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend notification failed (${response.status}): ${error}`);
  }

  return response.json();
}
