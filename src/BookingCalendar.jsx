import React from "react";
import { format, isSameDay } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

function BookingCalendar({ selectedRange, setSelectedRange, bookedDates }) {
  // A day is considered booked for sleep nights: start <= date < end (checkout morning is available)
  const isBooked = (date) =>
    bookedDates.some(({ start, end }) => date >= new Date(start) && date < new Date(end));

  const isStartOfBooking = (date) =>
    bookedDates.some(({ start }) => isSameDay(date, new Date(start)));

  const handleSelect = (range) => {
    if (range?.from && range?.to) {
      setSelectedRange([{ startDate: range.from, endDate: range.to, key: "selection" }]);
    } else if (range?.from) {
      setSelectedRange([{ startDate: range.from, endDate: range.from, key: "selection" }]);
    }
  };

  // IMPORTANT: Use separate disabled entries so checkout day remains clickable
  // 1) block the past, 2) block booked days EXCEPT the start day so users can select that as checkout
  const disabled = [
    { before: new Date() },
    (date) => isBooked(date) && !isStartOfBooking(date),
  ];

  const modifiers = { booked: isBooked };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md">
      <DayPicker
        mode="range"
        defaultMonth={new Date()}
        numberOfMonths={1}
        selected={
          selectedRange[0]?.startDate && selectedRange[0]?.endDate
            ? { from: selectedRange[0].startDate, to: selectedRange[0].endDate }
            : undefined
        }
        onSelect={handleSelect}
        disabled={disabled}
        modifiers={modifiers}
        modifiersStyles={{ booked: { backgroundColor: "#ddd", color: "#999" } }}
      />

      {selectedRange[0]?.startDate && selectedRange[0]?.endDate && (
        <p className="mt-2 text-sm text-gray-500">
          Booking from <strong>{format(selectedRange[0].startDate, "MMM d, yyyy")}</strong> to {" "}
          <strong>{format(selectedRange[0].endDate, "MMM d, yyyy")}</strong>
        </p>
      )}
    </div>
  );
}

export default BookingCalendar;
