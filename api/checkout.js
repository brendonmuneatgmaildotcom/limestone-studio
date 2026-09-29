// /api/checkout.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { calculateStayPrice } from "../lib/pricing.js";
import { getBookingCutoff } from "../lib/booking-cutoff.js";

const BOOKING_COM_ICAL_URL = "https://ical.booking.com/v1/export?t=e30eb621-32d5-454e-a0cb-c6acbdff90bf";

const hasIcalOverlap = (ical, startDate, endDate) =>
  Array.from(ical.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)).some(([event]) => {
    const start = event.match(/DTSTART;VALUE=DATE:(\d{8})/)?.[1];
    const end = event.match(/DTEND;VALUE=DATE:(\d{8})/)?.[1];
    if (!start || !end) return false;
    const eventStart = `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`;
    const eventEnd = `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`;
    return startDate < eventEnd && endDate > eventStart;
  });

/**
 * Env required on Vercel:
 *  - STRIPE_SECRET_KEY
 *  - NEXT_PUBLIC_BASE_URL   (e.g. https://www.limestonestudio.co.nz)
 * Frontend POST body shape:
 *  {
 *    "name": "Guest Name",
 *    "email": "guest@example.com",
 *    "dates": { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" },
 *    "guests": 1,
 *    "nonRefundable": false
 *  }
 */

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { name, email, dates, guests, nonRefundable = false } = req.body || {};
    const guestCount = Number(guests);
    if (
      !name ||
      !email ||
      !dates?.startDate ||
      !dates?.endDate ||
      ![1, 2].includes(guestCount) ||
      typeof nonRefundable !== "boolean"
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const parseDate = (value) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return null;
      return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    };
    const start = parseDate(dates.startDate);
    const end = parseDate(dates.endDate);
    if (!start || !end || end <= start) {
      return res.status(400).json({ error: "Please select at least one night" });
    }
    if (dates.startDate < getBookingCutoff().earliestBookableYMD) {
      return res.status(400).json({ error: "Same-day bookings close at 11am New Zealand time" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    const { data: overlaps, error: availabilityError } = await supabase
      .from("bookings")
      .select("id")
      .lt("start_date", dates.endDate)
      .gt("end_date", dates.startDate)
      .limit(1);

    if (availabilityError) throw availabilityError;
    if (overlaps?.length) {
      return res.status(409).json({ error: "Those dates have just become unavailable. Please choose other dates." });
    }

    const icalResponse = await fetch(BOOKING_COM_ICAL_URL, { cache: "no-store" });
    if (!icalResponse.ok) throw new Error("Could not verify Booking.com availability");
    if (hasIcalOverlap(await icalResponse.text(), dates.startDate, dates.endDate)) {
      return res.status(409).json({ error: "Those dates have just become unavailable. Please choose other dates." });
    }

    const { nights, amountNZD, longStayDiscountNZD } = calculateStayPrice(
      dates.startDate,
      dates.endDate,
      guestCount,
      nonRefundable,
    );
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
              description: `${dates.startDate} to ${dates.endDate}, ${guestCount} guest${guestCount > 1 ? "s" : ""}${nonRefundable ? ", non-refundable" : ""}${longStayDiscountNZD > 0 ? ", 10% week-stay discount" : ""}`,
            },
          },
        },
      ],
success_url: `${baseUrl}/?status=success&session_id={CHECKOUT_SESSION_ID}`,
cancel_url:  `${baseUrl}/?status=cancelled`,
      metadata: {
        name,
        email,
        startDate: dates.startDate,
        endDate: dates.endDate,
        guests: String(guestCount),
        nonRefundable: String(nonRefundable),
        longStayDiscount: String(longStayDiscountNZD > 0),
        nights: String(nights),
        amountNZD: String(amountNZD),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return res.status(500).json({ error: "Checkout failed" });
  }
}
