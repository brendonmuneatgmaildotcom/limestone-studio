// /api/confirm-checkout.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const toYMD = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, where: "method", error: "Method not allowed" });
  }

  const session_id = req.query.session_id;
  if (!session_id) {
    return res.status(400).json({ ok: false, where: "query", error: "Missing session_id" });
  }

  // ---- Stripe
  let stripe, session;
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    session = await stripe.checkout.sessions.retrieve(session_id);
  } catch (err) {
    console.error("❌ stripe.retrieve failed:", err?.message);
    return res.status(500).json({ ok: false, where: "stripe.retrieve", error: err?.message });
  }

  const minimalSession = {
    id: session?.id,
    status: session?.status,
    payment_status: session?.payment_status,
    mode: session?.mode,
    amount_total: session?.amount_total,
    currency: session?.currency,
    metadata: session?.metadata || null,
  };

  const paid = session?.payment_status === "paid" || session?.status === "complete";
  if (!paid) {
    console.log("ℹ️ not paid / not complete:", minimalSession);
    return res.status(200).json({ ok: false, where: "paid-check", reason: "not_paid", session: minimalSession });
  }

  const { name, email, startDate, endDate, nights, amountNZD } = session.metadata || {};
  if (!name || !email || !startDate || !endDate) {
    console.log("ℹ️ missing metadata:", minimalSession);
    return res.status(200).json({ ok: false, where: "metadata", reason: "missing_metadata", session: minimalSession });
  }

  // ---- Supabase (SERVICE ROLE)
  let supabase;
  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  } catch (err) {
    console.error("❌ supabase client create failed:", err?.message);
    return res.status(500).json({ ok: false, where: "supabase.client", error: err?.message });
  }

  // Idempotency: avoid dupes if user refreshes
  try {
    const { data: existing, error: selErr } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_session_id", session.id)
      .limit(1);

    if (selErr) {
      console.error("❌ supabase select failed:", selErr);
      return res.status(500).json({ ok: false, where: "supabase.select", error: selErr.message });
    }

    if (existing && existing.length) {
      console.log("ℹ️ already inserted:", session.id);
      return res.status(200).json({ ok: true, already: true, session: minimalSession });
    }
  } catch (err) {
    console.error("❌ supabase select exception:", err);
    return res.status(500).json({ ok: false, where: "supabase.select.ex", error: String(err) });
  }

  // Insert
  try {
    const payload = {
      name,
      email,
      start_date: toYMD(startDate),
      end_date: toYMD(endDate),
      status: "paid",
      stripe_session_id: session.id,                     // satisfies NOT NULL/UNIQUE
      total_nights: nights ? Number(nights) : null,
      amount_nzd: amountNZD ? Number(amountNZD) : null,
    };

    const { data, error } = await supabase.from("bookings").insert([payload]).select("id");

    if (error) {
      console.error("❌ supabase insert failed:", error);
      return res.status(500).json({ ok: false, where: "supabase.insert", error: error.message, payload, session: minimalSession });
    }

    console.log("✅ inserted booking:", { id: data?.[0]?.id, session: session.id });
    return res.status(200).json({ ok: true, inserted: data?.[0]?.id || true, session: minimalSession });
  } catch (err) {
    console.error("❌ supabase insert exception:", err);
    return res.status(500).json({ ok: false, where: "supabase.insert.ex", error: String(err) });
  }
}
