console.log("✅ Loaded Key ID:", process.env.RAZORPAY_KEY_ID);

const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());
app.use(express.static('public'));

// 🔐 Razorpay Credentials
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_SECRET) {
  console.error("❌ Missing Razorpay credentials in .env file");
  process.exit(1);
}

// 🛡️ Razorpay instance
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_SECRET,
});

// 1️⃣ Create Order
app.post('/create-order', async (req, res) => {
  const { amount } = req.body;

  if (!amount || typeof amount !== 'number') {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const options = {
    amount: amount * 100,
    currency: 'INR',
    receipt: 'receipt_' + Date.now(),
    payment_capture: 1
  };

  try {
    const order = await razorpay.orders.create(options);
    console.log("✅ Order created:", order.id);
    res.json({ order_id: order.id });
  } catch (err) {
    console.error('❌ Order creation failed:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// 2️⃣ Verify Payment
app.post('/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    console.log("❌ Missing fields in payment verification");
    return res.status(400).json({ success: false });
  }

  const generated_signature = crypto
    .createHmac('sha256', RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  console.log("🧾 Generated Signature:", generated_signature);
  console.log("🧾 Received Signature :", razorpay_signature);

  if (generated_signature === razorpay_signature) {
    console.log("✅ Payment successfully verified");
    return res.status(200).json({ success: true });
  } else {
    console.log("❌ Signature mismatch. Verification failed.");
    return res.status(400).json({ success: false });
  }
});

// 3️⃣ Store Contact Info
app.post('/api/store-order', (req, res) => {
  const { contact, note } = req.body;

  if (!contact || !note) {
    return res.status(400).json({ message: "Missing contact or note" });
  }

  console.log("📦 Received contact info:");
  console.log("  Contact:", contact);
  console.log("  Note   :", note);

  // Optionally store to DB or trigger WhatsApp/Email here
  res.status(200).json({ message: "Order info stored" });
});

// 🚀 Launch Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
