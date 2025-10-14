// /api/checkout.js
import Stripe from "stripe";

/**
 * Env required on Vercel:
 *  - STRIPE_SECRET_KEY
 *  - NEXT_PUBLIC_BASE_URL   (e.g. https://www.limestonestudio.co.nz)
 *  - NIGHTLY_RATE_NZD       (optional; default 160)
 *
 * Frontend POST body shape:
 *  {
 *    "name": "Guest Name",
 *    "email": "guest@example.com",
 *    "dates": { "startDate": ISOString, "endDate": ISOString }
 *  }
 */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { name, email, dates } = req.body || {};
    if (!name || !email || !dates?.startDate || !dates?.endDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Compute nights: block [start, end) in local time
    const toMidnight = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const start = toMidnight(dates.startDate);
    const end = toMidnight(dates.endDate);
    const MS_PER_NIGHT = 24 * 60 * 60 * 1000;
    const nights = Math.max(1, Math.round((end - start) / MS_PER_NIGHT));

    const nightlyNZD = Number(process.env.NIGHTLY_RATE_NZD || 160); // <— change default if you like
    const amountNZD = nightlyNZD * nights;
    const amountCents = Math.round(amountNZD * 100);

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `https://${req.headers.host || "www.limestonestudio.co.nz"}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "nzd",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "nzd",
            unit_amount: amountCents,
            product_data: {
              name: `Limestone Studio (${nights} night${nights > 1 ? "s" : ""})`,
              description: `${start.toLocaleDateString("en-NZ")} → ${end.toLocaleDateString("en-NZ")}`,
            },
          },
        },
      ],
success_url: `${baseUrl}/?status=success&session_id={CHECKOUT_SESSION_ID}`,
cancel_url:  `${baseUrl}/?status=cancelled`,
      metadata: {
        name,
        email,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        nights: String(nights),
        nightlyNZD: String(nightlyNZD),
        amountNZD: String(amountNZD),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return res.status(500).json({ error: "Checkout failed" });
  }
}
