// File: /api/checkout.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send({ message: 'Only POST requests allowed' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'on hold', // 'price_1RiPF9IEOR1FwcrYUSxWjMsY', 
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://limestone-studio.vercel.app/thank-you',
      cancel_url: 'https://limestone-studio.vercel.app/cancelled',
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
