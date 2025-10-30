// src/BookingCalendar.jsx
import React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

function BookingCalendar({ bookedDates }) {
  // A day is booked if it falls within any booked range
  const isBooked = (date) => {
    return bookedDates.some(({ start, end }) => {
      const s = new Date(start);
      const e = new Date(end);
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      return date >= s && date < e; // booked days = [start, end)
    });
  };

  const modifiers = {
    booked: isBooked,
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md select-none pointer-events-none">
      <DayPicker
        mode="single"                // prevents range logic
        selected={undefined}         // no visible selection
        onDayClick={() => {}}        // ignore clicks
        onSelect={() => {}}          // ignore range changes
        showOutsideDays={true}
        modifiers={modifiers}
        modifiersStyles={{
          booked: {
            backgroundColor: "#ddd",
            color: "#999",
          },
        }}
        defaultMonth={new Date()}    // starting month
        numberOfMonths={1}
      />
    </div>
  );
}

export default BookingCalendar;
