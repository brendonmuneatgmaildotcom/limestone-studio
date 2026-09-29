import { createClient } from "@supabase/supabase-js";
import { createBookingCalendar } from "../lib/ical-feed.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    const { data, error } = await supabase
      .from("bookings")
      .select("id, start_date, end_date")
      .eq("status", "paid")
      .order("start_date", { ascending: true });

    if (error) throw error;

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="limestone-studio.ics"');
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).send(createBookingCalendar(data || []));
  } catch (error) {
    console.error("Limestone Studio calendar export failed:", error);
    return res.status(500).send("Calendar unavailable");
  }
}
