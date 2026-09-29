const NOTIFICATION_EMAIL = "brendonmune@gmail.com";
const CONTACT_PHONE = "028 8521 8637";
const FROM_EMAIL = "Limestone Studio <bookings@limestonestudio.co.nz>";

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

async function sendEmail({ idempotencyKey, ...message }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend notification failed (${response.status}): ${error}`);
  }

  return response.json();
}

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
  const terms = isNonRefundable
    ? "Non-refundable (10% discount applied)"
    : "Refundable until 24 hours before check-in";
  const from = FROM_EMAIL;
  const ownerEmail = process.env.BOOKING_NOTIFICATION_EMAIL || NOTIFICATION_EMAIL;

  const ownerNotification = await sendEmail({
      idempotencyKey: `limestone-booking-${session.id}`,
      from,
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
        `Terms: ${terms}`,
        `Amount paid: $${amount} NZD`,
        `Stripe reference: ${session.id}`,
      ].join("\n"),
  });

  const guestConfirmation = await sendEmail({
    idempotencyKey: `limestone-guest-confirmation-${session.id}`,
    from,
    to: [email],
    reply_to: ownerEmail,
    subject: `Your Limestone Studio booking is confirmed: ${formatDate(startDate)}`,
    text: [
      `Hi ${name},`,
      "",
      "Thank you. Your Limestone Studio booking and payment are confirmed.",
      "",
      `Arrival: ${formatDate(startDate)} after 2pm`,
      `Checkout: ${formatDate(endDate)} before 11am`,
      `Nights: ${nights}`,
      `Guests: ${guestCount}`,
      `Terms: ${terms}`,
      `Amount paid: $${amount} NZD`,
      "",
      `For arrival details, changes or questions, reply to this email or call or text Brendon on ${CONTACT_PHONE}.`,
      "",
      "We look forward to welcoming you to Limestone Studio.",
    ].join("\n"),
  });

  return { ownerNotification, guestConfirmation };
}
