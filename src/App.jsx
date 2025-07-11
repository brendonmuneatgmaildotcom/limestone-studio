// src/App.jsx
import React, { useState } from "react";
import { Gallery, Item } from "react-photoswipe-gallery";
import "photoswipe/dist/photoswipe.css";
import { DateRange } from "react-date-range";
import { addDays, format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./index.css";


function App() {
  const [bookingDetails, setBookingDetails] = useState({
    name: "",
    email: "",
    dates: [
      { startDate: new Date(), endDate: addDays(new Date(), 1), key: "selection" },
    ],
  });

  const handleBooking = async () => {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  };

  const images = [
    "bed","loo","dinner","door","hall","rev",
    "out","kitch","shower","pondrev","pondfront"
  ].map(name => `/images/${name}.jpg`);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      {/* Banner & Hero */}
      <div className="relative left-1/2 w-[90vw] max-w-screen-xl -translate-x-1/2 mb-6">
        <div className="bg-green-700 text-white py-6 rounded-xl text-center">
          <h1 className="text-4xl font-bold">Limestone Studio</h1>
          <h2 className="text-2xl">website under development</h2>
        </div>
        <img
          src="/images/limestone.jpg"
          alt="Limestone Studio"
          className="w-full object-contain rounded-2xl shadow-lg mt-4"
        />
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Location */}
        <p className="text-sm text-center text-gray-600">
          📍 Top of Hospital Rd, Whangarei, New Zealand
        </p>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-md p-6 text-gray-800">
          {/* Add your description here */}
        </div>

        {/* Gallery with PhotoSwipe */}
        <div className="bg-white rounded-2xl shadow-md p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Gallery</h2>
          <Gallery>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map((src, index) => (
                <Item
                  key={index}
                  original={src}
                  thumbnail={src}
                  width="1600"
                  height="1200"
                >
                  {({ ref, open }) => (
                    <img
                      ref={ref}
                      onClick={open}
                      src={src}
                      alt={`Gallery ${index + 1}`}
                      className="rounded-xl object-cover w-full h-72 cursor-pointer"
                    />
                  )}
                </Item>
              ))}
            </div>
          </Gallery>
        </div>

        {/* Booking Section */}
        <div className="mt-8 space-y-6 bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold">Book Your Stay</h2>
          <DateRange
            editableDateInputs
            moveRangeOnFirstSelection={false}
            ranges={bookingDetails.dates}
            minDate={new Date()}
            onChange={item =>
              setBookingDetails({ ...bookingDetails, dates: [item.selection] })
            }
          />
          <p className="text-sm text-gray-600">
            Booking from{" "}
            <strong>{format(bookingDetails.dates[0].startDate, "MMM d, yyyy")}</strong>{" "}
            to{" "}
            <strong>{format(bookingDetails.dates[0].endDate, "MMM d, yyyy")}</strong>
          </p>
          <button
            onClick={handleBooking}
            className="bg-blue-600 text-white px-6 py-3 rounded"
          >
            Book Now
          </button>
        </div>

        {/* Contact Form */}
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
  );
}

export default App;
