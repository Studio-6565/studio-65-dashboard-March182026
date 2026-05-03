import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { project_id, project_name, amount, client_name, client_email, success_url, cancel_url } = await req.json();

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Invoice: ${project_name || 'Studio 65 Production'}`,
              description: `Payment for ${project_name} — Studio 65 Production`,
            },
            unit_amount: Math.round(amount * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: client_email || undefined,
      success_url: success_url || `${Deno.env.get('BASE44_APP_URL')}/client-portal?payment=success`,
      cancel_url: cancel_url || `${Deno.env.get('BASE44_APP_URL')}/client-portal?payment=cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        project_id: project_id || '',
        client_name: client_name || '',
      },
    });

    console.log(`Checkout session created: ${session.id} for project ${project_id}, amount $${amount}`);
    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});