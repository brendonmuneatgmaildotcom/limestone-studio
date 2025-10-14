// /api/confirm-checkout.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const toYMD = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "Missing session_id" });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const paid = session.payment_status === "paid" || session.status === "complete";
    if (!paid) return res.status(200).json({ inserted: false, reason: "not_paid" });

    const { name, email, startDate, endDate, nights, amountNZD } = session.metadata || {};
    if (!name || !email || !startDate || !endDate) {
      return res.status(200).json({ inserted: false, reason: "missing_metadata" });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // idempotency: don’t double-insert
    const { data: existing } = await supabase
      .from("bookings").select("id").eq("stripe_session_id", session.id).limit(1);
    if (existing?.length) return res.status(200).json({ inserted: false, reason: "already_inserted" });

    const { error } = await supabase.from("bookings").insert([{
      name, email,
      start_date: toYMD(startDate),
      end_date:   toYMD(endDate),
      status: "paid",
      stripe_session_id: session.id,
      total_nights: nights ? Number(nights) : null,
      amount_nzd: amountNZD ? Number(amountNZD) : null,
    }]);
    if (error) return res.status(500).json({ error: "DB insert failed" });

    return res.status(200).json({ inserted: true });
  } catch (err) {
    return res.status(500).json({ error: "Confirm failed" });
  }
}
