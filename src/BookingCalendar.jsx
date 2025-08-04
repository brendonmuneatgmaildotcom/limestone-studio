// src/BookingCalendar.jsx
import React from "react";
import { format, isBefore, isSameDay } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

function BookingCalendar({ selectedRange, setSelectedRange, bookedDates }) {
  const isBooked = (date) => {
    return bookedDates.some(({ start, end }) => {
      return date >= new Date(start) && date < new Date(end);
    });
  };

  const isStartOfBooking = (date) => {
    return bookedDates.some(({ start }) => isSameDay(date, new Date(start)));
  };

  const handleSelect = (range) => {
    if (range?.from && range?.to) {
      setSelectedRange([{ startDate: range.from, endDate: range.to, key: "selection" }]);
    } else if (range?.from) {
      setSelectedRange([{ startDate: range.from, endDate: range.from, key: "selection" }]);
    }
  };

  const modifiers = {
    booked: (date) =>
      isBooked(date) && !isStartOfBooking(date), // fully disabled dates
    checkoutable: (date) => isStartOfBooking(date),
  };

  const disabled = [
    {
      before: new Date(),
      day: (date) => isBooked(date) && !isStartOfBooking(date),
    },
  ];

  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <DayPicker
        mode="range"
        selected={{
          from: selectedRange[0]?.startDate,
          to: selectedRange[0]?.endDate,
        }}
        onSelect={handleSelect}
        disabled={disabled}
        modifiers={modifiers}
        modifiersStyles={{
          booked: { backgroundColor: "#ccc", color: "#888" },
          checkoutable: { backgroundColor: "#f0f0f0", color: "#000" },
        }}
      />
      {selectedRange[0]?.startDate && selectedRange[0]?.endDate && (
        <p className="mt-2 text-sm text-gray-500">
          Booking from{" "}
          <strong>{format(selectedRange[0].startDate, "MMM d, yyyy")}</strong> to{" "}
          <strong>{format(selectedRange[0].endDate, "MMM d, yyyy")}</strong>
        </p>
      )}
    </div>
  );
}

export default BookingCalendar;
