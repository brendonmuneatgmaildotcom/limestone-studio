// src/App.jsx

import React, { useState, useEffect } from "react";
import { Gallery, Item } from "react-photoswipe-gallery";
import { addDays, format } from "date-fns";
import { Helmet } from "react-helmet";
import BookingCalendar from "./BookingCalendar";
import ResponsiveImage from "./components/ResponsiveImage";
import { calculateStayPrice } from "../lib/pricing.js";
import { getBookingCutoff } from "../lib/booking-cutoff.js";

// Parse "YYYY-MM-DD" as LOCAL midnight to avoid UTC shifts in NZ time
const parseYMD = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatYMD = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function App() {
	const isValidEmail = (email) =>  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const initialStartDate = parseYMD(getBookingCutoff().earliestBookableYMD);

  const [bookingDetails, setBookingDetails] = useState({
    name: "",
    email: "",
    guests: 1,
    nonRefundable: false,
    dates: [
      {
        startDate: initialStartDate,
        endDate: addDays(initialStartDate, 1),
        key: "selection",
      },
    ],
  });

  const [bookedDates, setBookedDates] = useState([]);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [paymentState, setPaymentState] = useState({ loading: false, message: "", error: "" });
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

  const nights = Math.round((end - start) / (24 * 60 * 60 * 1000));
  if (nights < 1) {
    setPaymentState({ loading: false, message: "", error: "Please select at least one night." });
    return;
  }

  setPaymentState({ loading: true, message: "", error: "" });
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: bookingDetails.name,
        email: bookingDetails.email,
        guests: bookingDetails.guests,
        nonRefundable: bookingDetails.nonRefundable,
        dates: {
          startDate: formatYMD(start),
          endDate: formatYMD(end),
        },
      }),
    });
    const result = await res.json();
    if (res.ok && result?.url) {
      window.location.href = result.url;
    } else {
      setPaymentState({
        loading: false,
        message: "",
        error: result?.error || "Payment could not be started. Please try again.",
      });
    }
  } catch {
    setPaymentState({
      loading: false,
      message: "",
      error: "Could not connect to the secure payment page. Please try again.",
    });
  }
};

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  const sessionId = params.get("session_id");

  const clearQuery = () => window.history.replaceState({}, "", window.location.pathname);

  // --- loader: Supabase → bookedDates (Supabase only; no iCal)
// BEGIN REPLACEMENT: full loadDates() function
const loadDates = async () => {
  try {
    // 1) Supabase bookings
    const res = await fetch("/api/fetch-bookings");
    if (!res.ok) throw new Error("Could not load direct-booking availability");
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
        throw new Error(`Booking.com availability failed: ${icalRes.status}`);
      }
    } catch (icalErr) {
      console.error("Failed to import Booking.com iCal:", icalErr);
      throw icalErr;
    }

    // 3) Merge, then correct the preselected range if availability arrived after it.
    const allBookedDates = [...supabaseDates, ...events];
    const overlapsBooking = (start, end) =>
      allBookedDates.some(({ start: bookedStart, end: bookedEnd }) =>
        start < bookedEnd && end > bookedStart
      );

    setBookedDates(allBookedDates);
    setBookingDetails((current) => {
      const selectedStart = current.dates[0]?.startDate;
      const selectedEnd = current.dates[0]?.endDate;
      const earliest = parseYMD(getBookingCutoff().earliestBookableYMD);
      const selectionIsUnavailable =
        !selectedStart ||
        !selectedEnd ||
        selectedStart < earliest ||
        overlapsBooking(selectedStart, selectedEnd);

      if (!selectionIsUnavailable) return current;

      let nextStart = earliest;
      for (let day = 0; day < 730; day += 1) {
        const nextEnd = addDays(nextStart, 1);
        if (!overlapsBooking(nextStart, nextEnd)) {
          return {
            ...current,
            dates: [{ startDate: nextStart, endDate: nextEnd, key: "selection" }],
          };
        }
        nextStart = nextEnd;
      }

      return { ...current, dates: [] };
    });
    setAvailabilityLoaded(true);
  } catch (err) {
    console.error("loadDates() failed:", err);
    setPaymentState({
      loading: false,
      message: "",
      error: "Availability could not be checked. Please refresh the page before booking.",
    });
  }
};
// END REPLACEMENT

  const finishReturnFromStripe = async () => {
    if (status === "success" && sessionId) {
      setPaymentState({ loading: true, message: "Confirming your booking...", error: "" });
      try {
        const response = await fetch(`/api/confirm-checkout?session_id=${encodeURIComponent(sessionId)}`);
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Confirmation failed");
        setPaymentState({
          loading: false,
          message: "Payment received. Your booking is confirmed.",
          error: "",
        });
      } catch (error) {
        console.error("Booking confirmation failed:", error);
        setPaymentState({
          loading: false,
          message: "Your payment was received. Please contact Brendon if your dates do not appear shortly.",
          error: "",
        });
      } finally {
        clearQuery();
        await loadDates();
      }
      return;
    }

    if (status === "cancelled") {
      setPaymentState({ loading: false, message: "", error: "Payment was cancelled. No booking was made." });
      clearQuery();
    }
    await loadDates();
  };

  finishReturnFromStripe();
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

  const propertyGalleryMeta = [
    { name: "also-1", width: 1600, height: 1200 },
    { name: "also-2", width: 1600, height: 1200 },
    { name: "also-3", width: 1600, height: 1200 },
    { name: "also-4", width: 1600, height: 1200 },
    { name: "also-5", width: 1600, height: 1200 },
    { name: "also-6", width: 800, height: 583 },
    { name: "also-7", width: 813, height: 597 },
    { name: "also-8", width: 1600, height: 1200 },
  ];

  const selectedStart = bookingDetails.dates[0]?.startDate;
  const selectedEnd = bookingDetails.dates[0]?.endDate;
  const selectedNights = selectedStart && selectedEnd
    ? Math.max(0, Math.round((selectedEnd - selectedStart) / (24 * 60 * 60 * 1000)))
    : 0;
  const stayPrice = selectedNights > 0
    ? calculateStayPrice(
        formatYMD(selectedStart),
        formatYMD(selectedEnd),
        bookingDetails.guests,
        bookingDetails.nonRefundable,
      )
    : {
        subtotalNZD: 0,
        nonRefundableDiscountNZD: 0,
        longStayDiscountNZD: 0,
        discountNZD: 0,
        amountNZD: 0,
        breakdown: [],
      };
  const bookingTotal = stayPrice.amountNZD;
  const formatNZD = (amount) => Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  const rateGroups = stayPrice.breakdown.reduce((groups, night) => {
    groups[night.total] = (groups[night.total] || 0) + 1;
    return groups;
  }, {});

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


    <div className="min-h-screen overflow-x-hidden bg-yellow-100">
      <header className="w-full bg-green-600 py-6 text-center text-white">
        <h1 className="text-4xl font-bold">Limestone Studio</h1>
      </header>
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
          className="h-[67.5vw] max-h-[960px] w-full object-cover object-center shadow-lg"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
      </picture>

      <div className="sm:grid sm:grid-cols-[minmax(6rem,1fr)_minmax(0,80rem)_minmax(6rem,1fr)]">
        <div
          className="hidden self-stretch bg-left-top bg-repeat-y [background-size:6rem_auto] sm:block"
          style={{ backgroundImage: "url('/images/sidebanner.jpg')" }}
        ></div>

        <div className="min-w-0 w-full p-4 sm:p-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <p className="text-sm text-center text-gray-600">
            📍 Top of Hospital Rd, Whangārei, New Zealand
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
                {galleryMeta.slice(0, isGalleryExpanded ? galleryMeta.length : 2).map((img, i) => {
                  const thumbJpg  = `/images/${img.name}-thumb.jpg`;   // ~600px, small
                  const largeWebp = `/images/${img.name}-large.webp`;  // lightbox image

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
                          className="h-auto w-full cursor-pointer rounded-xl object-contain"
                        />
                      )}
                    </Item>
                  );
                })}
              </div>

              {!isGalleryExpanded && (
                <button
                  type="button"
                  aria-expanded="false"
                  onClick={() => setIsGalleryExpanded(true)}
                  className="mt-4 font-bold text-gray-800 hover:text-green-700"
                >
                  See more...
                </button>
              )}

              {isGalleryExpanded && (
                <>
                  <h3 className="mb-3 mt-8 text-2xl font-bold text-gray-800">Also on the property</h3>
                  <p className="mb-5 text-gray-700">
                    If you are interested in the limestone formations you see at the studio be sure to have Brendon and Delphine show you round the rest of the property including the cliff edge and its panoramic views.
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {propertyGalleryMeta.map((img) => {
                      const thumbJpg = `/images/${img.name}-thumb.jpg`;
                      const largeWebp = `/images/${img.name}-large.webp`;

                      return (
                        <Item
                          key={img.name}
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
                              alt="Limestone formations and views around the property"
                              width={img.width}
                              height={img.height}
                              loading="lazy"
                              decoding="async"
                              className="h-auto w-full cursor-pointer rounded-xl object-contain"
                            />
                          )}
                        </Item>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    aria-expanded="true"
                    onClick={() => setIsGalleryExpanded(false)}
                    className="mt-4 font-bold text-gray-800 hover:text-green-700"
                  >
                    See less...
                  </button>
                </>
              )}
            </Gallery>
          </div>
          {/* Availability and booking */}
          <div className="mt-8 space-y-6 bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold">Book Your Stay</h2>
            <p className="text-gray-700">Select your arrival and checkout dates. Gray dates are unavailable.</p>

            <BookingCalendar
              selectedRange={bookingDetails.dates}
              setSelectedRange={(newDates) =>
                setBookingDetails({ ...bookingDetails, dates: newDates })
              }
              bookedDates={bookedDates}
            />

            {selectedNights > 0 && (
              <div className="border-y border-gray-200 py-4 text-gray-800">
                <p>
                  <strong>{format(selectedStart, "d MMM yyyy")}</strong> to{" "}
                  <strong>{format(selectedEnd, "d MMM yyyy")}</strong>
                </p>
                <p className="mt-1">
                  {selectedNights} night{selectedNights === 1 ? "" : "s"} for {bookingDetails.guests} guest{bookingDetails.guests > 1 ? "s" : ""}
                </p>
                <div className="mt-2 text-sm text-gray-600">
                  {Object.entries(rateGroups).map(([rate, count]) => (
                    <p key={rate}>{count} night{count > 1 ? "s" : ""} at ${rate} NZD</p>
                  ))}
                </div>
                <div className="mt-3">
                  {!bookingDetails.nonRefundable && (
                    <p className="text-sm text-gray-600">
                      Refundable up until 24 hours before check-in
                    </p>
                  )}
                  {bookingDetails.nonRefundable && (
                    <p className="text-sm text-green-700">
                      10% non-refundable discount: -${formatNZD(stayPrice.nonRefundableDiscountNZD)} NZD
                    </p>
                  )}
                  <p className={selectedNights >= 6 ? "text-sm text-green-700" : "text-sm text-gray-600"}>
                    10% extra discount for one week stays (6 nights)
                    {selectedNights >= 6
                      ? `: -$${formatNZD(stayPrice.longStayDiscountNZD)} NZD`
                      : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-8 gap-y-3">
                    <p className="text-xl font-semibold">Total: ${formatNZD(bookingTotal)} NZD</p>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
                      <input
                        type="checkbox"
                        checked={bookingDetails.nonRefundable}
                        onChange={(event) =>
                          setBookingDetails({ ...bookingDetails, nonRefundable: event.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-12 shrink-0 items-center justify-center rounded bg-gray-500 text-base font-bold text-white transition-colors peer-checked:bg-green-700 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green-700"
                      >
                        {bookingDetails.nonRefundable ? "✓" : "X"}
                      </span>
                      <span>Go non-refundable for 10% off</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">
                Guests
                <select
                  value={bookingDetails.guests}
                  onChange={(event) => setBookingDetails({ ...bookingDetails, guests: Number(event.target.value) })}
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-base"
                >
                  <option value={1}>1 guest</option>
                  <option value={2}>2 guests</option>
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Name
                <input
                  type="text"
                  autoComplete="name"
                  value={bookingDetails.name}
                  onChange={(event) => setBookingDetails({ ...bookingDetails, name: event.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-base"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={bookingDetails.email}
                  onChange={(event) => setBookingDetails({ ...bookingDetails, email: event.target.value })}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-base"
                />
              </label>
            </div>

            {bookingDetails.email && !isValidEmail(bookingDetails.email) && (
              <p className="text-sm text-red-700">Please enter a valid email address.</p>
            )}
            {paymentState.message && (
              <p className="rounded bg-green-50 p-3 font-medium text-green-800" role="status">
                {paymentState.message}
              </p>
            )}
            {paymentState.error && (
              <p className="rounded bg-red-50 p-3 text-red-800" role="alert">
                {paymentState.error}
              </p>
            )}

            <button
              type="button"
              onClick={handleBooking}
              disabled={
                paymentState.loading ||
                !availabilityLoaded ||
                selectedNights < 1 ||
                !bookingDetails.name.trim() ||
                !isValidEmail(bookingDetails.email)
              }
              className="w-full rounded bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {paymentState.loading
                ? "Please wait..."
                : !availabilityLoaded
                  ? "Checking availability..."
                : `Pay $${formatNZD(bookingTotal)} NZD securely`}
            </button>

            <p className="text-sm text-gray-600">
              Prefer to book by phone? Call or text Brendon on{" "}
              <a href="tel:+642885218637" className="underline">028&nbsp;8521&nbsp;8637</a>.
            </p>
          </div>
        </div>{/* closes .max-w-4xl container */}
      </div>{/* closes .flex-1 main content column */}

      {/* RIGHT: vertical/banner strip (sibling of main content) */}
      <div
        className="hidden self-stretch bg-right-top bg-repeat-y [background-size:6rem_auto] sm:block"
        style={{ backgroundImage: "url('/images/rightbanner.jpg')" }}
      ></div>

      </div>{/* closes side-banner content row */}
    </div>{/* closes page */}
  </>
);
}

export default App;
