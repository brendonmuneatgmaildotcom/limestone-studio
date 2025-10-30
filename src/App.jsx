// src/App.jsx

import React, { useState, useEffect } from "react";
import { Gallery, Item } from "react-photoswipe-gallery";
import { addDays, subDays, format } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { Helmet } from "react-helmet";
import BookingCalendar from "./BookingCalendar";
import ResponsiveImage from "./components/ResponsiveImage";

// Parse "YYYY-MM-DD" as LOCAL midnight to avoid UTC shifts in NZ time
const parseYMD = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ===== DEV TRACE GUARDS (remove after you find the culprit) =====
if (supabase && typeof window !== "undefined") {
  // 1) Catch ANY call building a query on "bookings"
  const _from = supabase.from.bind(supabase);
  supabase.from = (table) => {
    const qb = _from(table);
    if (table === "bookings") {
      // Wrap INSERT specifically so we pause in *your* code, not vendor code
      const _insert = qb.insert?.bind(qb);
      qb.insert = (...args) => {
        console.trace('INSERT to "bookings" called with:', args);
        debugger; // <-- DevTools will pause here in YOUR file
        return _insert(...args);
      };
      // (Optional) wrap upsert/update too, if needed:
      const _upsert = qb.upsert?.bind(qb);
      if (_upsert) qb.upsert = (...args) => { console.trace('UPSERT "bookings"', args); debugger; return _upsert(...args); };
      const _update = qb.update?.bind(qb);
      if (_update) qb.update = (...args) => { console.trace('UPDATE "bookings"', args); debugger; return _update(...args); };
    }
    return qb;
  };

  // 2) Belt-and-suspenders: catch any fetch to the REST endpoint (in case a different client instance is used)
  const _fetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("/rest/v1/bookings")) {
      console.trace("FETCH → /rest/v1/bookings", { method: init?.method, body: init?.body });
      debugger; // <-- pause here in YOUR file
    }
    return _fetch(input, init);
  };
}
// ===== end DEV TRACE GUARDS =====



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

// App.jsx (replace handleBooking)
const handleBooking = async () => {
  const newBooking = bookingDetails.dates[0];
  if (!bookingDetails.name || !isValidEmail(bookingDetails.email)) {
    alert("Please enter a valid name and email.");
    return;
  }

  const start = newBooking.startDate;
  const end = newBooking.endDate;

  if (!isRangeAvailable(start, end)) {
    alert("Selected date range overlaps with an existing booking.");
    return;
  }

  // ✅ No Supabase insert here. Payment first; DB on webhook.
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
  const sessionId = params.get("session_id");

  // --- small helper to clear ?status&session_id from the URL
  const clearQuery = () => window.history.replaceState({}, "", window.location.pathname);

  // --- loader: Supabase → bookedDates (Supabase only; no iCal)
// BEGIN REPLACEMENT: full loadDates() function
const loadDates = async () => {
  try {
    // 1) Supabase bookings
    const res = await fetch("/api/fetch-bookings");
    const data = await res.json();

    const supabaseDates = Array.isArray(data)
      ? data.map((b) => ({
          id: b.id,
          // uses your existing YYYY-MM-DD helper
          start: parseYMD(b.start_date),
          end:   parseYMD(b.end_date),
          source: "supabase",
        }))
      : [];

    // 2) Booking.com iCal (optional) — safely wrapped
    let events = [];
    try {
      const icalRes = await fetch("/api/bookingcom");
      if (icalRes.ok) {
        const text = await icalRes.text();

        // Local 8-digit YYYYMMDD parser at local midnight
        const parseYMD8 = (s) => {
          const y = Number(s.slice(0, 4));
          const m = Number(s.slice(4, 6));
          const d = Number(s.slice(6, 8));
          return new Date(y, m - 1, d);
        };

        events = Array.from(text.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g))
          .map((entry) => {
            const startMatch = entry[0].match(/DTSTART;VALUE=DATE:(\d{8})/);
            const endMatch   = entry[0].match(/DTEND;VALUE=DATE:(\d{8})/);
            if (!startMatch || !endMatch) return null;

            const startRaw = parseYMD8(startMatch[1]);
            const endRaw   = parseYMD8(endMatch[1]); // DTEND is checkout (exclusive)

            // Guard: if DTEND <= DTSTART, coerce to single night
            const endExclusive =
              endRaw <= startRaw
                ? new Date(startRaw.getFullYear(), startRaw.getMonth(), startRaw.getDate() + 1)
                : endRaw;

            return { start: startRaw, end: endExclusive, source: "ical" };
          })
          .filter(Boolean);
      } else {
        console.error("Booking.com iCal fetch failed:", icalRes.status, icalRes.statusText);
      }
    } catch (icalErr) {
      console.error("Failed to import Booking.com iCal:", icalErr);
    }

    // 3) Merge & set
    setBookedDates([...supabaseDates, ...events]);
  } catch (err) {
    console.error("loadDates() failed:", err);
    setBookedDates([]); // safe fallback
  }
};
// END REPLACEMENT



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
  {/* Core SEO */}
  <title>Limestone Studio — Private Waterfall Garden accommodation in Whangārei</title>
  <link rel="canonical" href="https://www.limestonestudio.co.nz/" />
  <meta name="google-site-verification" content="_3yp5XLdhkWx-jbqsp2AG9PMnX1rpRa5MduenvpydYI" />
  <meta
    name="description"
    content="Relax in your own private studio accommodation with a peaceful limestone garden and waterfall, just a 5-minute walk from Whangārei Hospital."
  />

  {/* Open Graph (Facebook/LinkedIn/etc.) */}
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.limestonestudio.co.nz/" />
  <meta property="og:title" content="Limestone Studio — Private Waterfall Garden accommodation in Whangārei" />
  <meta
    property="og:description"
    content="Private boutique studio with limestone garden and waterfall, 5-minute walk from Whangārei Hospital."
  />
  <meta property="og:image" content="https://www.limestonestudio.co.nz/og-image.jpg" /> {/* replace with a real image */}
  <meta property="og:image:alt" content="Limestone Studio with limestone garden and waterfall" />

  {/* Twitter Card */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Limestone Studio — Private Waterfall Garden accommodation in Whangārei" />
  <meta
    name="twitter:description"
    content="Private boutique studio with limestone garden and waterfall, 5-minute walk from Whangārei Hospital."
  />
  <meta name="twitter:image" content="https://www.limestonestudio.co.nz/og-image.jpg" />

  {/* LodgingBusiness structured data */}
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      "name": "Limestone Studio",
      "url": "https://www.limestonestudio.co.nz/",
      "image": ["https://www.limestonestudio.co.nz/og-image.jpg"], // replace with your best photo
      "description":
        "Private boutique studio with limestone garden and waterfall, 5-minute walk from Whangārei Hospital.",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Whangārei",
        "addressRegion": "Northland",
        "addressCountry": "NZ"
      },
      "amenityFeature": [
        { "@type": "LocationFeatureSpecification", "name": "Free parking", "value": true },
        { "@type": "LocationFeatureSpecification", "name": "Wi-Fi", "value": true }
      ],
      "checkinTime": "15:00",
      "checkoutTime": "10:00",
      "priceRange": "$$"
    })}
  </script>


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
                  const thumbJpg  = `/images/${img.name}-thumb.jpg`;   // ~600px, small
                  const largeWebp = `/images/${img.name}-large.webp`;  // lightbox image
                  const largeJpg  = `/images/${img.name}.jpg`;         // fallback

                  return (
                    <Item
                      key={i}
                      original={largeWebp}
                      thumbnail={thumbJpg}
                      width={img.width}
                      height={img.height}
                    >
                      {({ ref, open }) => (
                        <img
                          ref={ref}
                          onClick={open}
                          src={thumbJpg}
                          alt={img.name}
                          width={img.width}
                          height={img.height}
                          loading="lazy"
                          decoding="async"
                          className="rounded-xl object-contain w-full h-auto transition-transform duration-300 ease-in-out transform hover:scale-125"
                        />
                      )}
                    </Item>
                  );
                })}
              </div>
            </Gallery>
          </div>

          {/* Availability card (separate section) */}
          <div className="mt-8 space-y-6 bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold">View availability</h2>

            <BookingCalendar
              selectedRange={bookingDetails.dates}
              setSelectedRange={(newDates) =>
                setBookingDetails({ ...bookingDetails, dates: newDates })
              }
              bookedDates={bookedDates}
            />

          

            {/* Call to book */}
            <p className="text-2xl font-semibold">
              To book, please call Delphine on {" "}
              <a href="tel:+64211234567" className="underline">021&nbsp;123&nbsp;4567</a>.
            </p>
          </div>
        </div>{/* ← closes .max-w-4xl container */}
      </div>{/* ← closes .flex-1 main content column */}

      {/* RIGHT: vertical/banner strip (sibling of main content) */}
      <div
        className="w-full h-16 sm:w-24 sm:h-auto bg-repeat-x sm:bg-repeat-y bg-bottom sm:bg-right bg-contain"
        style={{ backgroundImage: "url('/images/rightbanner.jpg')" }}
      ></div>
    </div>{/* ← closes outer .min-h-screen flex container */}
  </>
);
}

export default App;
