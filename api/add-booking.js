import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const filePath = path.join(process.cwd(), 'data', 'bookings.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const bookings = JSON.parse(fileContents);

  const newBooking = {
    ...req.body,
    id: Date.now(),
    created_at: new Date().toISOString()
  };

  bookings.push(newBooking);
  fs.writeFileSync(filePath, JSON.stringify(bookings, null, 2));

  res.status(201).json(newBooking);
}
