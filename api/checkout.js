// File: /api/checkout.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { name, email, dates } = req.body;

  if (!email || !dates?.startDate || !dates?.endDate) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  const start = new Date(dates.startDate);
  const end = new Date(dates.endDate);

  // Calculate number of nights
  const nights = Math.max(
    Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
    1
  );

  const pricePerNight = 150; // NZD
  const totalPrice = nights * pricePerNight * 100; // convert to cents

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'nzd',
            product_data: {
              name: 'Limestone Studio Booking',
              description: `${nights} night stay for ${name}`,
            },
            unit_amount: totalPrice, // in cents
          },
          quantity: 1,
        },
      ],
      success_url: 'https://limestone-studio.vercel.app/',
      cancel_url: 'https://limestone-studio.vercel.app/',
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
