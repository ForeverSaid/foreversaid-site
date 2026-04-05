// netlify/functions/stripe-webhook.js
// Handles Stripe webhook events and sends branded emails via Resend

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SITE_URL = 'https://foreversaid.co';

// Stripe product price IDs - you'll need to update these with your actual price IDs
// Find them in Stripe Dashboard > Products > click product > Pricing section
const PRODUCT_MAP = {
  // Map Stripe price IDs to product types
  // These get matched against the line_items in the checkout session
};

// Determine product type from Stripe session metadata
function getProductType(session) {
  // Use the success_url to determine what was purchased
  const successUrl = session.success_url || '';
  
  if (successUrl.includes('/kit/') || successUrl.includes('a7x9m2')) {
    return 'diy_regular';
  }
  if (successUrl.includes('/gift-certificate/') && session.amount_total === 7900) {
    return 'diy_gift';
  }
  if (successUrl.includes('/gift-certificate/') && session.amount_total === 69900) {
    return 'fullservice_gift';
  }
  if (successUrl.includes('/thank-you/') && session.amount_total === 69900) {
    return 'fullservice_regular';
  }
  if (successUrl.includes('/thank-you/') && session.amount_total === 62000) {
    return 'fullservice_upgrade';
  }
  
  // Fallback: determine by amount
  if (session.amount_total === 7900) return 'diy_regular';
  if (session.amount_total === 69900) return 'fullservice_regular';
  if (session.amount_total === 62000) return 'fullservice_upgrade';
  
  return 'unknown';
}

// Email templates
function getEmailContent(productType, customerName, sessionId) {
  const firstName = customerName ? customerName.split(' ')[0] : 'there';
  const shortCode = sessionId ? 'FS-' + sessionId.slice(-10).toUpperCase() : '';
  
  const baseStyles = `
    body { margin: 0; padding: 0; background: #FAF6F1; font-family: Georgia, 'Times New Roman', serif; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo-text { font-family: Georgia, "Times New Roman", serif; font-size: 28px; font-weight: bold; letter-spacing: 0.5px; }
    .logo-f { color: #1A1714; }
    .logo-s { color: #B8860B; }
    .card { background: #FFFFFF; border: 1px solid #E5DDD4; border-radius: 12px; padding: 40px 32px; margin-bottom: 24px; }
    h1 { font-size: 22px; color: #1A1714; margin: 0 0 16px 0; font-weight: 600; }
    p { font-size: 16px; color: #6B5B4E; line-height: 1.7; margin: 0 0 16px 0; font-weight: 400; }
    .btn { display: inline-block; background: #1A1714; color: #FAF6F1; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 500; margin: 8px 0 24px 0; }
    .btn-green { background: #8A9A7B; }
    .highlight { background: #F5F0E8; border-radius: 8px; padding: 20px 24px; margin: 16px 0; }
    .highlight p { margin: 0; font-size: 14px; }
    .code-box { background: #1A1714; border-radius: 8px; padding: 16px 24px; text-align: center; margin: 16px 0; }
    .code-label { font-size: 11px; color: rgba(250,246,241,0.5); text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px 0; }
    .code { font-family: monospace; font-size: 20px; color: #D4A853; letter-spacing: 3px; margin: 0; font-weight: 600; }
    .footer { text-align: center; padding: 24px 0; }
    .footer p { font-size: 13px; color: #A09080; }
    .footer a { color: #B8860B; }
    .divider { height: 1px; background: #E5DDD4; margin: 24px 0; }
  `;

  const templates = {
    
    diy_regular: {
      subject: 'Your ForeverSaid DIY Kit is ready',
      html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="wrapper">
          <div class="logo"><span class="logo-text"><span class="logo-f">Forever</span><span class="logo-s">Said</span></span></div>
          <div class="card">
            <h1>Hey ${firstName} — your DIY Kit is ready.</h1>
            <p>Thank you for purchasing the ForeverSaid DIY Storytelling Kit. Everything you need to capture your family's stories is waiting for you.</p>
            <p>Your kit includes personalized AI-generated questions, a recording guide, episode templates, intro/outro music, an editing tutorial, and a pull-quote card generator.</p>
            <a href="${SITE_URL}/kit/a7x9m2/" class="btn btn-green">Access Your DIY Kit</a>
            <div class="highlight">
              <p><strong>Bookmark this link.</strong> You can return to your kit anytime at:<br>${SITE_URL}/kit/a7x9m2/</p>
            </div>
            <div class="divider"></div>
            <p>Not sure where to start? Open the kit and begin with Step 1 — generating your personalized questions. The rest flows from there.</p>
            <p>Questions? Reply to this email or reach us at hello@foreversaid.co.</p>
          </div>
          <div class="footer">
            <p>ForeverSaid · <a href="${SITE_URL}">foreversaid.co</a></p>
            <p>You're receiving this because you purchased a ForeverSaid product.</p>
          </div>
        </div>
      </body></html>`
    },

    fullservice_regular: {
      subject: 'Welcome to ForeverSaid — let\'s get started',
      html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="wrapper">
          <div class="logo"><span class="logo-text"><span class="logo-f">Forever</span><span class="logo-s">Said</span></span></div>
          <div class="card">
            <h1>Hey ${firstName} — welcome to ForeverSaid.</h1>
            <p>Thank you for choosing the Full Service package. We're going to help you create something truly special — a podcast your family will treasure forever.</p>
            <p>The first step is filling out the intake form. This tells us about your storyteller so we can craft deeply personalized interview questions. It takes about 10 minutes.</p>
            <a href="${SITE_URL}/intake/" class="btn">Fill Out Your Intake Form</a>
            <div class="highlight">
              <p><strong>What happens next:</strong></p>
              <p style="margin-top: 8px;">1. You fill out the intake form (10 min)</p>
              <p>2. We send you personalized questions within 3–5 days</p>
              <p>3. You record at your own pace</p>
              <p>4. Upload your audio and we handle the rest</p>
            </div>
            <div class="divider"></div>
            <p>You can always return to the intake form at:<br>${SITE_URL}/intake/</p>
            <p>Questions? Reply to this email or reach us at hello@foreversaid.co.</p>
          </div>
          <div class="footer">
            <p>ForeverSaid · <a href="${SITE_URL}">foreversaid.co</a></p>
            <p>You're receiving this because you purchased a ForeverSaid product.</p>
          </div>
        </div>
      </body></html>`
    },

    fullservice_upgrade: {
      subject: 'Your ForeverSaid upgrade is confirmed',
      html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="wrapper">
          <div class="logo"><span class="logo-text"><span class="logo-f">Forever</span><span class="logo-s">Said</span></span></div>
          <div class="card">
            <h1>Hey ${firstName} — your upgrade is confirmed.</h1>
            <p>You've upgraded to Full Service. Great choice — we'll take it from here.</p>
            <p>The next step is filling out the intake form so we can learn about your storyteller and craft the most personalized questions possible.</p>
            <a href="${SITE_URL}/intake/" class="btn">Fill Out Your Intake Form</a>
            <div class="highlight">
              <p><strong>You still have access to your DIY Kit</strong> at ${SITE_URL}/kit/a7x9m2/ — feel free to use any of those resources alongside the full service experience.</p>
            </div>
            <div class="divider"></div>
            <p>Questions? Reply to this email or reach us at hello@foreversaid.co.</p>
          </div>
          <div class="footer">
            <p>ForeverSaid · <a href="${SITE_URL}">foreversaid.co</a></p>
            <p>You're receiving this because you purchased a ForeverSaid product.</p>
          </div>
        </div>
      </body></html>`
    },

    diy_gift: {
      subject: 'Your ForeverSaid Gift Certificate is ready',
      html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="wrapper">
          <div class="logo"><span class="logo-text"><span class="logo-f">Forever</span><span class="logo-s">Said</span></span></div>
          <div class="card">
            <h1>Hey ${firstName} — your gift certificate is ready.</h1>
            <p>Thank you for giving someone the gift of their family's stories. That's a beautiful thing.</p>
            <p>Click below to personalize your gift certificate with the recipient's name and a personal message, then download it as a PDF or print it directly.</p>
            <a href="${SITE_URL}/gift-certificate/?session_id=${sessionId}" class="btn">Create Your Gift Certificate</a>
            ${shortCode ? `
            <div class="code-box">
              <p class="code-label">Redemption Code</p>
              <p class="code">${shortCode}</p>
            </div>
            ` : ''}
            <div class="highlight">
              <p><strong>Save this email.</strong> Your gift certificate link and redemption code are above. You can return to this page anytime to re-download your certificate.</p>
            </div>
            <div class="divider"></div>
            <p>When the recipient is ready, they email hello@foreversaid.co with their redemption code and we'll get them started.</p>
            <p>Questions? Reply to this email or reach us at hello@foreversaid.co.</p>
          </div>
          <div class="footer">
            <p>ForeverSaid · <a href="${SITE_URL}">foreversaid.co</a></p>
            <p>You're receiving this because you purchased a ForeverSaid product.</p>
          </div>
        </div>
      </body></html>`
    },

    fullservice_gift: {
      subject: 'Your ForeverSaid Gift Certificate is ready',
      html: `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
        <div class="wrapper">
          <div class="logo"><span class="logo-text"><span class="logo-f">Forever</span><span class="logo-s">Said</span></span></div>
          <div class="card">
            <h1>Hey ${firstName} — your gift certificate is ready.</h1>
            <p>Thank you for giving someone the gift of their family's stories. The Full Service experience means we handle everything — they just need to show up and record.</p>
            <p>Click below to personalize your gift certificate with the recipient's name and a personal message, then download it as a PDF or print it directly.</p>
            <a href="${SITE_URL}/gift-certificate/?session_id=${sessionId}" class="btn">Create Your Gift Certificate</a>
            ${shortCode ? `
            <div class="code-box">
              <p class="code-label">Redemption Code</p>
              <p class="code">${shortCode}</p>
            </div>
            ` : ''}
            <div class="highlight">
              <p><strong>Save this email.</strong> Your gift certificate link and redemption code are above. You can return to this page anytime to re-download your certificate.</p>
            </div>
            <div class="divider"></div>
            <p>When the recipient is ready, they email hello@foreversaid.co with their redemption code and we'll get them started.</p>
            <p>Questions? Reply to this email or reach us at hello@foreversaid.co.</p>
          </div>
          <div class="footer">
            <p>ForeverSaid · <a href="${SITE_URL}">foreversaid.co</a></p>
            <p>You're receiving this because you purchased a ForeverSaid product.</p>
          </div>
        </div>
      </body></html>`
    }
  };

  return templates[productType] || templates.diy_regular;
}

// Send email via Resend API
async function sendEmail(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ForeverSaid <hello@foreversaid.co>',
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}

// Also send a notification to you (the business owner)
async function sendOwnerNotification(productType, customerName, customerEmail, sessionId, amount) {
  const subject = `New ForeverSaid Order: ${productType.replace('_', ' ').toUpperCase()} — $${(amount / 100).toFixed(2)}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>New Order Received</h2>
      <p><strong>Product:</strong> ${productType.replace('_', ' ')}</p>
      <p><strong>Customer:</strong> ${customerName || 'Not provided'}</p>
      <p><strong>Email:</strong> ${customerEmail}</p>
      <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
      <p><strong>Stripe Session:</strong> ${sessionId}</p>
      <p><strong>Redemption Code:</strong> FS-${sessionId.slice(-10).toUpperCase()}</p>
      <p><a href="https://dashboard.stripe.com/payments">View in Stripe Dashboard</a></p>
    </div>
  `;

  try {
    await sendEmail('mark@foreversaid.co', subject, html);
  } catch (err) {
    console.error('Failed to send owner notification:', err);
    // Don't throw — owner notification failure shouldn't break the customer email
  }
}

// Verify Stripe webhook signature
function verifyStripeSignature(body, signature) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('No STRIPE_WEBHOOK_SECRET set — skipping signature verification');
    return true;
  }

  const crypto = require('crypto');
  const elements = signature.split(',');
  const signatureMap = {};
  
  for (const element of elements) {
    const [key, value] = element.split('=');
    signatureMap[key] = value;
  }

  const timestamp = signatureMap['t'];
  const expectedSignature = signatureMap['v1'];

  if (!timestamp || !expectedSignature) return false;

  const payload = `${timestamp}.${body}`;
  const computedSignature = crypto
    .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(computedSignature)
  );
}

// Main handler
exports.handler = async function(event) {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Verify the webhook signature
  const signature = event.headers['stripe-signature'];
  if (signature && !verifyStripeSignature(event.body, signature)) {
    console.error('Invalid Stripe signature');
    return { statusCode: 400, body: 'Invalid signature' };
  }

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    console.error('Failed to parse webhook body:', err);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Only handle checkout.session.completed events
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: JSON.stringify({ received: true, ignored: true }) };
  }

  const session = stripeEvent.data.object;
  const customerEmail = session.customer_details?.email || session.customer_email;
  const customerName = session.customer_details?.name || '';
  const sessionId = session.id;
  const amount = session.amount_total;

  if (!customerEmail) {
    console.error('No customer email found in session:', sessionId);
    return { statusCode: 200, body: JSON.stringify({ received: true, error: 'no_email' }) };
  }

  // Determine product type and send appropriate email
  const productType = getProductType(session);
  console.log(`Processing ${productType} order for ${customerEmail} (session: ${sessionId})`);

  const emailContent = getEmailContent(productType, customerName, sessionId);

  try {
    // Send customer email
    await sendEmail(customerEmail, emailContent.subject, emailContent.html);
    console.log(`Customer email sent to ${customerEmail}`);

    // Send owner notification
    await sendOwnerNotification(productType, customerName, customerEmail, sessionId, amount);
    console.log('Owner notification sent');

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, emailSent: true, productType }),
    };
  } catch (err) {
    console.error('Error sending email:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ received: true, error: err.message }),
    };
  }
};
