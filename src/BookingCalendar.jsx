import React from "react";
import { format, isSameDay } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

function BookingCalendar({ selectedRange, setSelectedRange, bookedDates }) {
  // Normalize to local midnight for all comparisons
  const atMidnight = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  // Nights booked: start ≤ date < end (checkout morning free)
  const isBooked = (date) => {
    const ds = atMidnight(date);
    return bookedDates.some(({ start, end }) => {
      const s = atMidnight(start);
      const e = atMidnight(end);
      return ds >= s && ds < e;
    });
  };

  const isStartOfBooking = (date) =>
    bookedDates.some(({ start }) => isSameDay(atMidnight(date), atMidnight(start)));

  const handleSelect = (range) => {
    if (range?.from && range?.to) {
      setSelectedRange([{ startDate: range.from, endDate: range.to, key: "selection" }]);
    } else if (range?.from) {
      setSelectedRange([{ startDate: range.from, endDate: range.from, key: "selection" }]);
    }
  };

  // IMPORTANT: function entry (not `{ day: fn }`) so DayPicker doesn’t
  // inadvertently disable the range start (which causes the 14→15 shift).
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


    </div>
  );
}

export default BookingCalendar;
