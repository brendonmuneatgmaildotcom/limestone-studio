import { DateRange } from "react-date-range";
import { addDays, format } from "date-fns";
import React, { useState } from "react";

function App() {
  const [bookingDetails, setBookingDetails] = useState({
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

  return (
    <div className="p-8 font-sans">
      <div className="bg-white p-6 rounded-2xl shadow-lg max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Book Your Stay</h2>

        <DateRange
          editableDateInputs={true}
          onChange={(item) => setBookingDetails({ dates: [item.selection] })}
          moveRangeOnFirstSelection={false}
          ranges={bookingDetails.dates}
          minDate={new Date()}
        />

        <div className="mt-4 text-gray-600">
          <p>
            Booking from{" "}
            <strong>{format(bookingDetails.dates[0].startDate, "MMM d, yyyy")}</strong> to{" "}
            <strong>{format(bookingDetails.dates[0].endDate, "MMM d, yyyy")}</strong>
          </p>
          <p>
            Total nights:{" "}
            <strong>
              {Math.max(
                1,
                Math.ceil(
                  (bookingDetails.dates[0].endDate - bookingDetails.dates[0].startDate) /
                    (1000 * 60 * 60 * 24)
                )}
              </strong>
            </p>
        </div>

        <button
          onClick={handleBooking}
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

export default App;
