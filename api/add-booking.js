// api/add-booking.js
import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const filePath = path.resolve("./public/data/bookings.json");
    const json = await fs.readFile(filePath, "utf-8");
    const bookings = JSON.parse(json);
    const newBooking = req.body;

    bookings.push(newBooking);

    await fs.writeFile(filePath, JSON.stringify(bookings, null, 2));

    res.status(200).json({ message: "Booking saved" });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ message: "Failed to write booking." });
  }
}
