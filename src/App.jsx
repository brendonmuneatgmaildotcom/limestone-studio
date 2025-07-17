// src/App.jsx
import React, { useState, useEffect } from "react";
import { Gallery, Item } from "react-photoswipe-gallery";
import "photoswipe/dist/photoswipe.css";
import { DateRange } from "react-date-range";
import { addDays, format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./index.css";
import { supabase } from "./supabaseClient";
import IcalExpander from "ical-expander";

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

const ICAL_URL = "https://corsproxy.io/?" + encodeURIComponent(
  "https://ical.booking.com/v1/export?t=e30eb621-32d5-454e-a0cb-c6acbdff90bf"
);


useEffect(() => {
  const fetchBookingComIcal = async () => {
    try {
      const res = await fetch(ICAL_URL);
      const icalText = await res.text();

      const icalExpander = new IcalExpander({ ics: icalText, maxIterations: 100 });
      const events = icalExpander.between(new Date("2024-01-01"), new Date("2026-01-01"));

      console.log("RAW events from iCal:", events);

      const newDates = events.events.map((event) => {
  const start = new Date(event.startDate.toJSDate());
  const end = new Date(event.endDate.toJSDate());

  // Adjust end date to exclude checkout day
  end.setDate(end.getDate() - 1);

  console.log(`Parsed booking: ${start.toDateString()} to ${end.toDateString()}`);
  return { start, end };
});


      setBookedDates((prev) => [...prev, ...newDates]);
    } catch (err) {
      console.error("Failed to import Booking.com iCal:", err);
    }
  };

  fetchBookingComIcal();
}, []);



const [bookedDates, setBookedDates] = useState([]);

useEffect(() => {
  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("start_date, end_date");

    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      const formatted = data.map((b) => ({
        start: new Date(b.start_date),
        end: new Date(b.end_date),
      }));
      setBookedDates(formatted);
    }
  };

  fetchBookings();
}, []);


  const isDateBooked = (date) => {
    return bookedDates.some(({ start, end }) => date >= start && date <= end);
  };

  const handleBooking = async () => {
    const newBooking = bookingDetails.dates[0];
    const { name, email } = bookingDetails;

    setBookedDates([...bookedDates, { start: newBooking.startDate, end: newBooking.endDate }]);

    const { data, error } = await supabase.from("bookings").insert([
      {
        name,
        email,
        start_date: newBooking.startDate.toISOString(),
        end_date: newBooking.endDate.toISOString(),
      },
    ]);

    if (error) {
      console.error("Supabase error:", error.message);
      alert("Booking failed. Please try again.");
      return;
    }

    const res = await fetch("/api/checkout", { method: "POST" });
    const checkoutData = await res.json();
    window.location.href = checkoutData.url;
  };

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
      <div
        className="w-full h-16 sm:w-24 sm:h-auto bg-repeat-x sm:bg-repeat-y bg-top sm:bg-left bg-contain"
        style={{ backgroundImage: "url('/images/sidebanner.jpg')" }}
      ></div>

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
            <p className="mb-4">
              Private studio with your own private waterfall garden and just a
              few minutes walk to Whangarei Hospital so you can free-park outside your front
              door and walk to the Hospital
            </p>
            <p className="mb-4">
              Elegant room with large screen TV and AppleTV box or plug your
              laptop in directly. Your own toilet/shower ensuite. A kitchenette
              with microwave, fridge and utensils
            </p>
            <p className="mb-4">
              Your front door takes you through your own private corridor to
              your studio. Out the window you'll see the limestone
              waterfall garden which is all yours
            </p>
            <p className="mb-4">
              The property is at the end of a cul-de-sac so very quiet and
              peaceful
            </p>
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
              onChange={(e) =>
                setBookingDetails({ ...bookingDetails, name: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              required
            />

            <input
              type="email"
              placeholder="Your Email"
              value={bookingDetails.email}
              onChange={(e) =>
                setBookingDetails({ ...bookingDetails, email: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              required
            />

            <DateRange
              editableDateInputs
              moveRangeOnFirstSelection={false}
              ranges={bookingDetails.dates}
              minDate={new Date()}
              onChange={(item) =>
                setBookingDetails({ ...bookingDetails, dates: [item.selection] })
              }
              disabledDay={isDateBooked}
            />

            <p className="text-sm text-gray-600">
              Booking from{" "}
              <strong>
                {format(bookingDetails.dates[0].startDate, "MMM d, yyyy")}
              </strong>{" "}
              to{" "}
              <strong>
                {format(bookingDetails.dates[0].endDate, "MMM d, yyyy")}
              </strong>
            </p>

            <button
              onClick={handleBooking}
              className="bg-blue-600 text-white px-6 py-3 rounded"
            >
              Book Now
            </button>
          </div>

          <form
            id="contact"
            action="https://formspree.io/f/mpwrnlnn"
            method="POST"
            className="bg-white rounded-2xl shadow-md p-6 space-y-4"
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
        </div>
      </div>

      <div
        className="w-full h-16 sm:w-24 sm:h-auto bg-repeat-x sm:bg-repeat-y bg-bottom sm:bg-right bg-contain"
        style={{ backgroundImage: "url('/images/rightbanner.jpg')" }}
      ></div>
    </div>
  );
}

export default App;
