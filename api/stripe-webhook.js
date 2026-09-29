import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendBookingNotification } from "../lib/booking-notification.js";

export const config = {
  api: { bodyParser: false },
};

async function readBody(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      await readBody(req),
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("Invalid Stripe webhook signature:", error.message);
    return res.status(400).send("Invalid signature");
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") {
    return res.status(200).json({ received: true });
  }

  const { name, email, startDate, endDate, nights, amountNZD } = session.metadata || {};
  if (!name || !email || !startDate || !endDate) {
    console.error("Paid Stripe session is missing booking details:", session.id);
    return res.status(500).json({ error: "Missing booking details" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: existing, error: lookupError } = await supabase
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", session.id)
    .limit(1);

  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (existing?.length) {
    try {
      await sendBookingNotification(session);
    } catch (notificationError) {
      console.error("Failed to send booking notification:", notificationError);
      return res.status(500).json({ error: "Could not send booking notification" });
    }
    return res.status(200).json({ received: true });
  }

  const { error } = await supabase.from("bookings").insert([
    {
      name,
      email,
      start_date: startDate.slice(0, 10),
      end_date: endDate.slice(0, 10),
      status: "paid",
      stripe_session_id: session.id,
      total_nights: Number(nights),
      amount_nzd: Number(amountNZD),
    },
  ]);

  if (error) {
    console.error("Failed to store paid booking:", error);
    return res.status(500).json({ error: "Could not store booking" });
  }

  try {
    await sendBookingNotification(session);
  } catch (notificationError) {
    console.error("Failed to send booking notification:", notificationError);
    return res.status(500).json({ error: "Could not send booking notification" });
  }

  return res.status(200).json({ received: true });
}
