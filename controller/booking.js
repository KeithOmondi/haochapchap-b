// routes/booking.js

const express = require("express");
const router = express.Router();
const Booking = require("../model/booking");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const sendMail = require("../utils/sendMail");

// Create a new booking
router.post(
  "/create-booking",
  catchAsyncErrors(async (req, res, next) => {
    const { name, email, phone, date, time, message } = req.body;

    if (!name || !email || !phone || !date || !time) {
      return next(new ErrorHandler("All required fields must be filled.", 400));
    }

    // Combine date and time into a single Date object
    const bookingDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(bookingDateTime)) {
      return next(new ErrorHandler("Invalid date or time format.", 400));
    }

    const booking = await Booking.create({
      name,
      email,
      phone,
      bookingDateTime,
      message,
    });

    // Send confirmation email
    const emailOptions = {
      email,
      subject: "Your Appointment Confirmation – HaoChapChap",
      message: "Thank you for booking an appointment with us!",
      htmlMessage: `
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 8px;">
              <h2 style="color: #2a9d8f;">Hello ${name},</h2>
              <p>Thanks for booking with <strong>HaoChapChap</strong>. Here are the details of your appointment:</p>
              <ul>
                <li><strong>Phone:</strong> ${phone}</li>
                <li><strong>Date & Time:</strong> ${bookingDateTime.toLocaleString()}</li>
              </ul>
              ${
                message
                  ? `<p><strong>Your message:</strong><br/>${message}</p>`
                  : ""
              }
              <p>If we need to contact you, we will use the email or phone provided.</p>
              <p style="margin-top: 30px;">See you soon!<br/>— HaoChapChap Team</p>

              <footer style="text-align: center; font-size: 12px; color: #888; margin-top: 40px;">
                &copy; ${new Date().getFullYear()} HaoChapChap. All rights reserved.
              </footer>
            </div>
          </body>
        </html>
      `,
    };

    await sendMail(emailOptions);

    res.status(201).json({
      success: true,
      booking,
      message: "Booking created and confirmation email sent.",
    });
  })
);

// Get all bookings (e.g., admin dashboard)
router.get(
  "/all-bookings",
  catchAsyncErrors(async (req, res, next) => {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, bookings });
  })
);

// PUT /booking/update-status/:id
router.put(
  "/update-status/:id",
  catchAsyncErrors(async (req, res, next) => {
    const bookingId = req.params.id;
    const { status } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new ErrorHandler("Booking not found", 404));
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      booking,
    });
  })
);

module.exports = router;
