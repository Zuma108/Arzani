router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        switch (event.type) {
            case 'invoice.payment_succeeded':
                await updateSubscriptionStatus(
                    event.data.object.subscription,
                    'active'
                );
                break;
            case 'invoice.payment_failed':
                await updateSubscriptionStatus(
                    event.data.object.subscription,
                    'past_due'
                );
                break;
            case 'customer.subscription.deleted':
                await updateSubscriptionStatus(
                    event.data.object.id,
                    'canceled'
                );
                break;
        }

        res.json({received: true});
    } catch (err) {
        console.error('Webhook error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});