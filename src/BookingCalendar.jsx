// src/BookingCalendar.jsx
import React, { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { getBookingCutoff } from "../lib/booking-cutoff.js";

const atMidnight = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

function BookingCalendar({ selectedRange, setSelectedRange, bookedDates }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const earliestBookableDate = atMidnight(getBookingCutoff(now).earliestBookableYMD);

  const isBooked = (date) => {
    const day = atMidnight(date);
    return bookedDates.some(({ start, end }) => {
      const bookingStart = atMidnight(start);
      const bookingEnd = atMidnight(end);
      return day >= bookingStart && day < bookingEnd;
    });
  };

  const selected = selectedRange[0]?.startDate
    ? { from: selectedRange[0].startDate, to: selectedRange[0].endDate }
    : undefined;

  const handleSelect = (range) => {
    if (!range?.from) return;
    setSelectedRange([
      {
        startDate: range.from,
        endDate: range.to || range.from,
        key: "selection",
      },
    ]);
  };

  return (
    <div className="overflow-x-auto">
      <DayPicker
        mode="range"
        min={1}
        selected={selected}
        onSelect={handleSelect}
        disabled={[{ before: earliestBookableDate }, isBooked]}
        excludeDisabled
        modifiers={{ booked: isBooked }}
        modifiersStyles={{
          booked: {
            backgroundColor: "#ddd",
            color: "#777",
            borderRadius: "4px",
          },
        }}
      />
    </div>
  );
}

export default BookingCalendar;
