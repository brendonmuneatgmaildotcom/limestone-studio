// /api/stripe-webhook.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Required by Stripe to read the raw body
export const config = {
  api: { bodyParser: false },
};

// Utility to read the raw request body
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Helper: convert ISO date to YYYY-MM-DD
function toYMD(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Invalid signature:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Only care about completed payments
  if (event.type !== "checkout.session.completed") {
    console.log("Ignoring event:", event.type);
    return res.json({ received: true });
  }

  const session = event.data.object;
  const paid =
    session.payment_status === "paid" && session.status === "complete";

  if (!paid) {
    console.log("Session not paid/complete:", session.id);
    return res.json({ received: true });
  }

  const { name, email, startDate, endDate, nights, amountNZD } =
    session.metadata || {};

  if (!name || !email || !startDate || !endDate) {
    console.error("❌ Missing metadata on session", session.id, session.metadata);
    return res.json({ received: true });
  }

  // ✅ Use server-side Supabase client with SERVICE ROLE key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Prevent duplicate insert if Stripe retries
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_session_id", session.id)
      .limit(1);

    if (existing && existing.length) {
      console.log("ℹ️ Booking already stored:", session.id);
      return res.json({ received: true });
    }

    // Insert new paid booking
    const { error } = await supabase.from("bookings").insert([
      {
        name,
        email,
        start_date: toYMD(startDate),
        end_date: toYMD(endDate),
        status: "paid",
        stripe_session_id: session.id,
        total_nights: nights ? Number(nights) : null,
        amount_nzd: amountNZD ? Number(amountNZD) : null,
      },
    ]);

    if (error) {
      console.error("❌ Supabase insert failed:", error);
      return res.status(500).json({ error: "DB insert failed" });
    }

    console.log("✅ Booking stored:", { session: session.id, startDate, endDate });
    return res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler exception:", err);
    return res.status(500).json({ error: "Unhandled webhook error" });
  }
}
