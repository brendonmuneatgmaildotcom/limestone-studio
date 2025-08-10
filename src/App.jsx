// src/App.jsx

import React, { useState, useEffect } from "react";
import { Gallery, Item } from "react-photoswipe-gallery";
import { addDays, subDays, format } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { Helmet } from "react-helmet";
import BookingCalendar from "./BookingCalendar";
import ResponsiveImage from "./components/ResponsiveImage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
	const isValidEmail = (email) =>  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
  const [adminError, setAdminError] = useState("");

  const isDateBooked = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  return bookedDates.some(({ start, end }) => {
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return d >= s && d < e;  // NOTICE: `< e` instead of `<= e`
  });
};
const isRangeAvailable = (start, end) => {
  const rangeStart = new Date(start);
  const rangeEnd = new Date(end);
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(0, 0, 0, 0);

  return !bookedDates.some(({ start: bookedStart, end: bookedEnd }) => {
    const bs = new Date(bookedStart);
    const be = new Date(bookedEnd);
    bs.setHours(0, 0, 0, 0);
    be.setHours(0, 0, 0, 0);

    return !(rangeEnd <= bs || rangeStart >= be); // This means they overlap
  });
};


const handleBooking = async () => {
  const newBooking = bookingDetails.dates[0];

  if (!bookingDetails.name || !bookingDetails.email) {
    alert("Please fill in both name and email.");
    return;
  }

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValidEmail(bookingDetails.email)) {
    alert("Please enter a valid email address.");
    return;
  }

  const start = newBooking.startDate;
  const end = newBooking.endDate;

  if (!isRangeAvailable(start, end)) {
    alert("Selected date range overlaps with an existing booking.");
    return;
  }

  // de Insert into Supabase
  const insertData = {
    name: bookingDetails.name,
    email: bookingDetails.email,
    start_date: start.toLocaleDateString("en-CA"),
    end_date: end.toLocaleDateString("en-CA"),
  };

  const { data, error } = await supabase.from("bookings").insert([insertData]);

  if (error) {
    alert("Booking failed: " + error.message);
    return;
  }

  setBookedDates([...bookedDates, { start, end }]);
  alert("Booking saved! Redirecting to payment...");

  // ⚠️ NEW: Create Stripe Checkout session
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: bookingDetails.name,
        email: bookingDetails.email,
        dates: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      }),
    });

    const result = await res.json();

    if (result?.url) {
      window.location.href = result.url;
    } else {
      alert("Failed to initiate payment.");
    }
  } catch (err) {
    alert("Error connecting to payment gateway: " + err.message);
  }
};



  const fetchAdminBookings = async () => {
    try {
      const res = await fetch("/api/fetch-bookings");
      const data = await res.json();

      if (res.ok) {
        setAdminBookings(data);
      } else {
        console.error("Failed to fetch admin bookings:", data.error);
      }
    } catch (err) {
      console.error("Network or server error:", err);
    }
  };

  const handleAdminClick = async () => {
    if (showAdmin) {
      setShowAdmin(false);
      return;
    }

    const input = prompt("Enter admin password:");
    if (!input) return;

    const { data, error } = await supabase
      .from("admin_keys")
      .select("*")
      .eq("secret", input);

    if (error) {
      console.error("Supabase query error:", error);
      setAdminError("Error checking credentials.");
    } else if (data.length > 0) {
      setShowAdmin(true);
      setAdminError("");
    } else {
      setAdminError("Incorrect password.");
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
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");

  if (status === "success") {
    alert("✅ Thank you for your payment. A confirmation email will follow.");
  } else if (status === "cancelled") {
    alert("⚠️ Payment and booking cancelled. Thank you.");
  }

 const loadDates = async () => {
  let supabaseDates = [];

  try {
    const res = await fetch("/api/fetch-bookings");
    const data = await res.json();

    if (Array.isArray(data)) {
      supabaseDates = data.map((b) => ({
        id: b.id,
        start: new Date(b.start_date),
        end: new Date(b.end_date),
        source: "supabase",
      }));
    }
  } catch (err) {
    console.error("Backend booking fetch failed:", err);
  }

  try {
    const res = await fetch("/api/bookingcom");
    const text = await res.text();
    const events = Array.from(text.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g))
  .map((entry) => {
    const startMatch = entry[0].match(/DTSTART;VALUE=DATE:(\d{8})/);
    const endMatch = entry[0].match(/DTEND;VALUE=DATE:(\d{8})/);
    if (!startMatch || !endMatch) return null;

    const parse = (s) =>
      new Date(`${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`);

    const start = parse(startMatch[1]);
    const endRaw = parse(endMatch[1]);

    const end =
      startMatch[1] === endMatch[1]
        ? endRaw // single-day booking — do NOT subtract
        : subDays(endRaw, 1); // multi-day — subtract one

    return { start, end, source: "ical" };
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
    <>
      <Helmet>
        <title>Limestone Studio — Private Waterfall Garden accommodation in Whangārei</title>
        <meta
          name="description"
          content="Relax in your own private studio accommodation with a peaceful limestone garden and waterfall, just a 5 minute walk from Whangārei Hospital.."
        />
      </Helmet>
    <div className="min-h-screen bg-yellow-100 flex flex-col sm:flex-row justify-center">
      <div className="w-full h-16 sm:w-24 sm:h-auto bg-repeat-x sm:bg-repeat-y bg-top sm:bg-left bg-contain" style={{ backgroundImage: "url('/images/sidebanner.jpg')" }}></div>
      <div className="flex-1 max-w-7xl p-4 sm:p-6">
        <div className="relative left-1/2 w-[90vw] max-w-screen-xl -translate-x-1/2 mb-6">
          <div className="bg-green-600 text-white py-6 rounded-xl text-center">
            <h1 className="text-4xl font-bold">Limestone Studio</h1>
            <h2 className="text-2xl">website under development</h2>
          </div>
          <picture>
  <source
    type="image/avif"
    srcSet="/images/limestone-640.avif 640w, /images/limestone-1024.avif 1024w, /images/limestone-1600.avif 1600w"
    sizes="100vw"
  />
  <source
    type="image/webp"
    srcSet="/images/limestone-640.webp 640w, /images/limestone-1024.webp 1024w, /images/limestone-1600.webp 1600w"
    sizes="100vw"
  />
  <img
    src="/images/limestone-1024.jpg"
    alt="Limestone Studio"
    width="1600"
    height="1200"
    className="w-full object-contain rounded-2xl shadow-lg mt-4"
    loading="eager"
    fetchpriority="high"
    decoding="async"
  />
</picture>

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
            <p className="mb-4">Toiletries, Milk, Hairdryer, Free Wifi, Free Parking, Microwave, Fridge, USB charging, Tea/Coffee, Cutlery, Dishes, Dining table, Writing desk, Large Screen TV with AppleTV shows and movies, Garden, Waterfall, Bush views</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Gallery</h2>
<Gallery>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {galleryMeta.map((img, i) => {
      const largeWebp = `/images/${img.name}-large.webp`;  // lightbox image
      const largeJpg  = `/images/${img.name}.jpg`;         // fallback if needed

      const thumbAvif = `/images/${img.name}-thumb.avif`;  // grid thumb
      const thumbWebp = `/images/${img.name}-thumb.webp`;
      const thumbJpg  = `/images/${img.name}-thumb.jpg`;

      return (
        <Item
          key={i}
          original={largeWebp}               // use webp to avoid any avif quirks
          thumbnail={thumbJpg}               // helps Photoswipe with zoom/thumb
          width={img.width}
          height={img.height}
        >
          {({ ref, open }) => (
            <button
              ref={ref}
              onClick={open}
              className="block cursor-pointer"
              type="button"
              aria-label={`Open ${img.name}`}
            >
              <picture>
                <source srcSet={thumbAvif} type="image/avif" />
                <source srcSet={thumbWebp} type="image/webp" />
                <img
                  src={thumbJpg}
                  alt={img.name}
                  width={img.width}
                  height={img.height}
                  loading="lazy"
                  decoding="async"
                  className="rounded-xl object-contain w-full h-auto transition-transform duration-300 ease-in-out transform hover:scale-125"
                />
              </picture>
            </button>
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
  onChange={(e) =>
    setBookingDetails({ ...bookingDetails, email: e.target.value })
  }
  className="w-full border rounded px-3 py-2"
/>
{bookingDetails.email && !isValidEmail(bookingDetails.email) && (
  <p className="text-sm text-red-600 mt-1">Please enter a valid email address</p>
)}

            <BookingCalendar
  selectedRange={bookingDetails.dates}
  setSelectedRange={(newDates) =>
    setBookingDetails({ ...bookingDetails, dates: newDates })
  }
  bookedDates={bookedDates}
/>

            <p className="text-sm text-gray-600">
              Booking from <strong>{format(bookingDetails.dates[0].startDate, "MMM d, yyyy")}</strong> to <strong>{format(bookingDetails.dates[0].endDate, "MMM d, yyyy")}</strong>
            </p>
        <button
  onClick={handleBooking}
  disabled={
    !bookingDetails.name || !isValidEmail(bookingDetails.email)
  }
  className={`mt-4 px-6 py-3 rounded text-white ${
    !bookingDetails.name || !isValidEmail(bookingDetails.email)
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-blue-600 hover:bg-blue-700"
  }`}
>
  Book Now (under construction - call 028 8521 8637)
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
    </>
  );
}

export default App; 
