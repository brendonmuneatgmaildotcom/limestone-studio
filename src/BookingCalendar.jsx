// src/BookingCalendar.jsx
import React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

function BookingCalendar({ bookedDates }) {
  // Any date that falls inside a booked range
  const isBooked = (date) =>
    bookedDates.some(({ start, end }) => date >= new Date(start) && date < new Date(end));

  // Mark booked days with a subtle gray background
  const modifiers = { booked: isBooked };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md select-none">
      <DayPicker
        mode="single"             // use a neutral mode (no range UI)
        onSelect={() => {}}       // disable click selection
        showOutsideDays           // still show neighboring days
        disableNavigation={false} // keep arrows working
        selected={undefined}      // no highlight for today or anything
        today={undefined}         // hide today highlight
        modifiers={modifiers}
        modifiersStyles={{
          booked: {
            backgroundColor: "#ddd",
            color: "#999",
            borderRadius: "4px",
          },
        }}
        styles={{
          caption: { color: "#333", fontWeight: 600 },
          day: { cursor: "default" },
        }}
      />
    </div>
  );
}

export default BookingCalendar;
