// Limestone Studio Airbnb-style Page

import React, { useState } from "react";
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

  const [submitted, setSubmitted] = useState(false);

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    // You can also send bookingDetails to a backend or email here

    // Redirect to Stripe
    window.location.href = "https://buy.stripe.com/test_5kQ9AU5mN8xX2Xg7NCb3q00";

    // Optionally show confirmation if not redirecting
    // setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Title */}
        <h1 className="text-4xl font-bold text-center text-gray-800">Limestone Studio</h1>

        {/* Image */}
        <img
          src="/images/limestone.jpg"
          alt="Limestone Studio"
          className="w-full object-contain rounded-2xl shadow-lg"
        />

        {/* Location */}
        <p className="text-sm text-center text-gray-600">
          📍 Top of Hospital Rd, Whangarei, New Zealand
        </p>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-md p-6 text-gray-800">
          <p className="mb-4">
            Private studio with your own private waterfall garden and just a 5 minute walk to
            Whangarei Hospital. Free park outside your front door and walk to the Hospital.
          </p>
          <p className="mb-4">
            Elegant room with large screen TV and AppleTV box or plug your laptop in directly. Your own
            toilet/shower ensuite. A kitchenette with microwave, fridge and utensils.
          </p>
          <p className="mb-4">
            Your front door takes you through your own private corridor to your private studio. Out the
            window you'll see the limestone waterfall garden which is yours to occupy with table and
            chairs if you want to sip something nice in front of the limestone rock formations or even
            dine there.
          </p>
          <p className="mb-4">
            The property is at the end of a cul-de-sac so very quiet and peaceful. As your hosts,
            Brendon and Delphine, our default is to give you the same privacy a hotel would. We're
            absolutely available any time for any needs or requests but until you ask us we stay out of
            your way from arrival to departure.
          </p>
        </div>

        {/* Gallery */}
        <div className="bg-white rounded-2xl shadow-md p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Gallery</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <img src="/images/bed.jpg" alt="Bed" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/loo.jpg" alt="Toilet" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/dinner.jpg" alt="Dining" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/door.jpg" alt="Front door" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/hall.jpg" alt="Corridor" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/rev.jpg" alt="Corridor reverse" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/out.jpg" alt="Parking spot" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/kitch.jpg" alt="Kitchenette" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/shower.jpg" alt="Shower" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/pondrev.jpg" alt="Garden" className="rounded-xl object-cover w-full h-56" />
            <img src="/images/pondfront.jpg" alt="Limestone formation" className="rounded-xl object-cover w-full h-56" />
          </div>
        </div>

        {/* Price + Book */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl shadow-md px-6 py-4">
          <div className="text-gray-800 text-lg font-semibold">
            Range depending on guests and whether weekday or weekend: $120 - $180 NZD / night
          </div>
          <a
            href="#contact"
            className="mt-3 sm:mt-0 inline-block bg-blue-600 text-white px-5 py-2 rounded-xl text-sm hover:bg-blue-700 transition"
          >
            Contact Us
          </a>
        </div>

        {/* Booking Form */}
        {!submitted ? (
          <form onSubmit={handleBookingSubmit} className="mt-8 space-y-6 bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold">Book Your Stay</h2>

            {/* Calendar */}
            <DateRange
              editableDateInputs={true}
              onChange={(item) =>
                setBookingDetails({ ...bookingDetails, dates: [item.selection] })
              }
              moveRangeOnFirstSelection={false}
              ranges={bookingDetails.dates}
              minDate={new Date()}
            />

            {/* Form Fields */}
            <div>
              <label className="block mb-1 font-medium">Name</label>
              <input
                required
                type="text"
                value={bookingDetails.name}
                onChange={(e) =>
                  setBookingDetails({ ...bookingDetails, name: e.target.value })
                }
                className="w-full border px-4 py-2 rounded-md"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Email</label>
              <input
                required
                type="email"
                value={bookingDetails.email}
                onChange={(e) =>
                  setBookingDetails({ ...bookingDetails, email: e.target.value })
                }
                className="w-full border px-4 py-2 rounded-md"
              />
            </div>

            {/* Summary */}
            <p className="text-sm text-gray-600">
              Booking from <strong>{format(bookingDetails.dates[0].startDate, "MMM d, yyyy")}</strong> to{" "}
              <strong>{format(bookingDetails.dates[0].endDate, "MMM d, yyyy")}</strong>
            </p>
            <p className="text-sm text-gray-600">
              Total nights: <strong>
                {Math.max(
                  1,
                  Math.ceil(
                    (bookingDetails.dates[0].endDate - bookingDetails.dates[0].startDate) / (1000 * 60 * 60 * 24)
                  )
                )}
              </strong>
            </p>

            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700"
            >
              Book & Pay
            </button>
          </form>
        ) : (
          <div className="mt-6 p-6 bg-green-50 border border-green-300 rounded-xl">
            <h2 className="text-xl font-bold text-green-800 mb-2">Booking Request Sent!</h2>
            <p>We'll confirm your booking and reply shortly.</p>
          </div>
        )}

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
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <textarea
            name="message"
            placeholder="Your Message"
            rows="4"
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
          ></textarea>
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
