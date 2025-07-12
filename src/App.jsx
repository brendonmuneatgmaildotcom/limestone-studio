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
      {
        startDate: new Date(),
        endDate: addDays(new Date(), 1),
        key: "selection",
      },
    ],
  });

  const handleBooking = async () => {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
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
  <div className="min-h-screen bg-yellow-100 flex justify-center">
      {/* Side Banner */}
      <div
        className="w-16 bg-repeat-y bg-left bg-contain"
        style={{
          backgroundImage: "url('/images/sidebanner.jpg')",
        }}
      ></div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl p-4 sm:p-6">
        {/* Banner & Hero */}
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

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Location */}
          <p className="text-sm text-center text-gray-600">
            📍 Top of Hospital Rd, Whangarei, New Zealand
          </p>

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-800">
            <p className="mb-4">
              Private studio with your own private waterfall garden and just a
              few minutes walk to Whangarei Hospital so you can free-park outside your front
              door and walk to the Hospital.
            </p>
            <p className="mb-4">
              Elegant room with large screen TV and AppleTV box or plug your
              laptop in directly. Your own toilet/shower ensuite. A kitchenette
              with microwave, fridge and utensils.
            </p>
            <p className="mb-4">
              Your front door takes you through your own private corridor to
              your studio. Out the window you'll see the limestone
              waterfall garden which is all yours
            </p>
            <p className="mb-4">
              The property is at the end of a cul-de-sac so very quiet and
              peaceful.
            </p>
            <p className="mb-4">
              Check in any time after 2pm, checkout is 11am but if there is no booking the 
			  day of your checkout, on request you can extend checkout to midday.
            </p>
          </div>

          {/* Gallery */}
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

          {/* Booking Section */}
          <div className="mt-8 space-y-6 bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold">Book Your Stay</h2>
            <DateRange
              editableDateInputs
              moveRangeOnFirstSelection={false}
              ranges={bookingDetails.dates}
              minDate={new Date()}
              onChange={(item) =>
                setBookingDetails({
                  ...bookingDetails,
                  dates: [item.selection],
                })
              }
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
	    {/* Right banner */}
  <div
    className="w-16 bg-repeat-y bg-right bg-contain"
    style={{
      backgroundImage: "url('/images/sidebanner.jpg')",
    }}
  ></div>
    </div>
  );
}

export default App;
