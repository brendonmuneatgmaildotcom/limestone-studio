import { DateRange } from "react-date-range";
import { addDays, isSameDay, isBefore, isAfter, isWithinInterval } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import React from "react";

export default function BookingCalendar({ bookedDates, selectionRange, onChange }) {
  const isDateBooked = (date) => {
    return bookedDates.some(({ start, end }) => {
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Treat bookings as [start, end) — user leaves on end date
      return isWithinInterval(date, {
        start: startDate,
        end: addDays(endDate, -1),
      });
    });
  };

  const isRangeBooked = ({ startDate, endDate }) => {
    const checkDate = new Date(startDate);
    while (isBefore(checkDate, endDate)) {
      if (isDateBooked(checkDate)) return true;
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return false;
  };

  const handleSelect = (ranges) => {
    const range = ranges.selection;
    if (isRangeBooked(range)) {
      alert("❌ Selected range overlaps with an existing booking.");
      return;
    }
    onChange(range);
  };

  const disabledDay = (date) => isDateBooked(date);

  return (
    <DateRange
      ranges={[selectionRange]}
      onChange={handleSelect}
      minDate={new Date()}
      disabledDay={disabledDay}
      moveRangeOnFirstSelection={false}
    />
  );
}
