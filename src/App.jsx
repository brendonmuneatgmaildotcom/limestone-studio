// src/App.jsx

import React, { useState, useEffect } from "react";
import { Gallery, Item } from "react-photoswipe-gallery";
import "photoswipe/dist/photoswipe.css";
import { DateRange } from "react-date-range";
import { addDays, format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./index.css";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [bookingDetails, setBookingDetails] = useState({
    name: "",
    email: "",
    dates: [
      {
        startDate: new Date(),
        endDate: addDays(new Date(), 1),
        key: "selection",
      },
    ],
  });

  const [bookedDates, setBookedDates] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);

 const isDateBooked = (date) => {
  const d = new Date(date.setHours(0, 0, 0, 0));
  return bookedDates.some(({ start, end }) => {
    const s = new Date(start.setHours(0, 0, 0, 0));
    const e = new Date(end.setHours(0, 0, 0, 0));
    return d >= s && d <= e;
  });
};

  const handleBooking = async () => {
    const newBooking = bookingDetails.dates[0];

    const { data, error } = await supabase.from("bookings").insert([
      {
        name: bookingDetails.name,
        email: bookingDetails.email,
        start_date: newBooking.startDate.toISOString(),
        end_date: newBooking.endDate.toISOString(),
      },
    ]);

    if (!error) {
      setBookedDates([
        ...bookedDates,
        { start: newBooking.startDate, end: newBooking.endDate },
      ]);
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      window.location.href = data.url;
    } else {
      console.error("Booking failed", error);
    }
  };

  const fetchAdminBookings = async () => {
    const { data, error } = await supabase.from("bookings").select("*");
    if (error) {
      console.error("Failed to fetch admin bookings:", error);
    } else {
      setAdminBookings(data);
    }
  };

  const deleteBooking = async (id) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) {
      setAdminBookings((prev) => prev.filter((b) => b.id !== id));
      setBookedDates((prev) => prev.filter((b) => b.source !== "supabase" || b.id !== id));
    } else {
      console.error("Delete failed", error);
    }
  };

  useEffect(() => {
    const loadDates = async () => {
      const supabaseBookings = await supabase.from("bookings").select("id, start_date, end_date");
      let supabaseDates = [];
      if (supabaseBookings.data) {
        supabaseDates = supabaseBookings.data.map((b) => ({
          id: b.id,
          start: new Date(b.start_date),
          end: new Date(b.end_date),
          source: "supabase",
        }));
      }

      try {
        const res = await fetch("/api/bookingcom");
        const text = await res.text();
        const events = Array.from(text.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g))
          .map((entry) => {
            const startMatch = entry[0].match(/DTSTART;VALUE=DATE:(\d{8})/);
            const endMatch = entry[0].match(/DTEND;VALUE=DATE:(\d{8})/);
            if (!startMatch || !endMatch) return null;
            const parse = (s) => new Date(`${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`);
            return {
              start: parse(startMatch[1]),
              end: addDays(parse(endMatch[1]), -1),
              source: "ical",
            };
          })
          .filter(Boolean);

        setBookedDates([...supabaseDates, ...events]);
      } catch (err) {
        console.error("Failed to import Booking.com iCal:", err);
        setBookedDates([...supabaseDates]);
      }
    };

    loadDates();
  }, []);

  const galleryMeta = [
    { name: "bed", width: 1600, height: 1200 },
    { name: "pondrev", width: 1600, height: 1200 },
    { name: "dinner", width: 1200, height: 1600 },
    { name: "door", width: 1200, height: 1600 },
    { name: "loo", width: 1200, height: 1600 },
    { name: "hall", width: 1200, height: 1600 },
    { name: "rev", width: 1200, height: 1600 },
    { name: "kitch", width: 1200, height: 1600 },
    { name: "pondfront", width: 1600, height: 1200 },
    { name: "out", width: 1600, height: 1200 },
    { name: "shower", width: 1200, height: 1600 },
    { name: "drive", width: 1200, height: 1600 },
  ];

  return (
    <div className="min-h-screen bg-yellow-100 flex flex-col sm:flex-row justify-center">
      <div className="w-full h-16 sm:w-24 sm:h-auto bg-repeat-x sm:bg-repeat-y bg-top sm:bg-left bg-contain" style={{ backgroundImage: "url('/images/sidebanner.jpg')" }}></div>
      <div className="flex-1 max-w-7xl p-4 sm:p-6">
        <div className="relative left-1/2 w-[90vw] max-w-screen-xl -translate-x-1/2 mb-6">
          <div className="bg-green-600 text-white py-6 rounded-xl text-center">
            <h1 className="text-4xl font-bold">Limestone Studio</h1>
            <h2 className="text-2xl">website under development</h2>
          </div>
          <img
            src="/images/limestone.jpg"
            alt="Limestone Studio"
            className="w-full object-contain rounded-2xl shadow-lg mt-4"
          />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <p className="text-sm text-center text-gray-600">
            📍 Top of Hospital Rd, Whangarei, New Zealand
          </p>

          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-800">
            <p className="mb-4">Private studio with your own private waterfall garden and just a few minutes walk to Whangarei Hospital so you can free-park outside your front door and walk to the Hospital</p>
            <p className="mb-4">Elegant room with large screen TV and AppleTV box or plug your laptop in directly. Your own toilet/shower ensuite. A kitchenette with microwave, fridge and utensils</p>
            <p className="mb-4">Your front door takes you through your own private corridor to your studio. Out the window you'll see the limestone waterfall garden which is all yours</p>
            <p className="mb-4">The property is at the end of a cul-de-sac so very quiet and peaceful</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-800">
            <p className="mb-4">Check in any time after 2pm, checkout any time before 11am</p>
            <p className="mb-4">Check in process: Call or text on arrival and we'll show you in</p>
            <p className="mb-4">Check out process: Call or text on departure, we'll collect the key</p>
            <p className="mb-4">If you prefer contactless privacy from arrival to departure just let us know and we'll send you instructions</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-800">
            <p className="mb-4 font-bold">Amenities</p>
            <p className="mb-4">Toiletries, Milk, Hairdryer</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Gallery</h2>
            <Gallery>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {galleryMeta.map((img, i) => {
                  const src = `/images/${img.name}.jpg`;
                  return (
                    <Item
                      key={i}
                      original={src}
                      thumbnail={src}
                      width={img.width}
                      height={img.height}
                    >
                      {({ ref, open }) => (
                        <img
                          ref={ref}
                          onClick={open}
                          src={src}
                          alt={img.name}
                          className="rounded-xl object-contain w-full h-auto cursor-pointer transition-transform duration-300 ease-in-out transform hover:scale-125"
                        />
                      )}
                    </Item>
                  );
                })}
              </div>
            </Gallery>
          </div>

          <div className="mt-8 space-y-6 bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold">Book Your Stay</h2>
            <input
              type="text"
              placeholder="Your Name"
              value={bookingDetails.name}
              onChange={(e) => setBookingDetails({ ...bookingDetails, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="email"
              placeholder="Your Email"
              value={bookingDetails.email}
              onChange={(e) => setBookingDetails({ ...bookingDetails, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            <DateRange
              editableDateInputs
              moveRangeOnFirstSelection={false}
              ranges={bookingDetails.dates}
              minDate={new Date()}
              onChange={(item) => setBookingDetails({ ...bookingDetails, dates: [item.selection] })}
              disabledDay={isDateBooked}
            />
            <p className="text-sm text-gray-600">
              Booking from <strong>{format(bookingDetails.dates[0].startDate, "MMM d, yyyy")}</strong> to <strong>{format(bookingDetails.dates[0].endDate, "MMM d, yyyy")}</strong>
            </p>
            <button onClick={handleBooking} className="bg-blue-600 text-white px-6 py-3 rounded">
              Book Now
            </button>
          </div>

          <form
            id="contact"
            action="https://formspree.io/f/mpwrnlnn"
            method="POST"
            className="bg-white rounded-2xl shadow-md p-6 space-y-4 mt-8"
          >
            <h2 className="text-2xl font-bold text-gray-800">Send an Inquiry</h2>
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              required
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              required
              className="w-full border rounded px-3 py-2"
            />
            <textarea
              name="message"
              placeholder="Your Message"
              rows="4"
              required
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700"
            >
              Send Message
            </button>
          </form>

          <div className="mt-6">
            <button onClick={() => setShowAdmin(!showAdmin)} className="bg-black text-white px-4 py-2 rounded">
              {showAdmin ? "Hide Admin" : "Show Admin"}
            </button>
          </div>

          {showAdmin && (
            <div className="mt-6 bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold mb-4">Admin Dashboard</h3>
              <button
                onClick={fetchAdminBookings}
                className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
              >
                Fetch Bookings
              </button>
              <ul className="space-y-4">
                {adminBookings.map((b) => (
                  <li key={b.id} className="border-b pb-2 flex justify-between">
                    <div>
                      <p className="font-semibold">{b.name} ({b.email})</p>
                      <p>{new Date(b.start_date).toLocaleDateString()} to {new Date(b.end_date).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => deleteBooking(b.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Delete Booking
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="w-full h-16 sm:w-24 sm:h-auto bg-repeat-x sm:bg-repeat-y bg-bottom sm:bg-right bg-contain" style={{ backgroundImage: "url('/images/rightbanner.jpg')" }}></div>
    </div>
  );
}

export default App;
