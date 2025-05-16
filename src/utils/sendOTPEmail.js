const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
  user: process.env.BREVO_USER,
  pass: process.env.BREVO_PASS,
}

});

const sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: `"Poetree Publications" <${process.env.BREVO_EMAIL}>`,
    to,
    subject: "Your OTP for Poetree Signup",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
        <div style="text-align: center;">
          <img src="https://poetreepublications.com/poetree.png" alt="Poetree Logo" style="max-height: 100px; margin-bottom: 20px;" />
          <h2 style="color: #2c3e50;">Welcome to Poetree Publications</h2>
          <p style="font-size: 16px; color: #555;">Your One-Time Password (OTP) is:</p>
          <div style="font-size: 30px; font-weight: bold; color: #2980b9; margin: 20px 0;">${otp}</div>
          <p style="font-size: 14px; color: #999;">Please use this OTP to verify your account. It will expire in 10 minutes.</p>
        </div>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="text-align: center; font-size: 12px; color: #aaa;">If you didn’t sign up for Poetree, please ignore this email.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendNewPasswordEmail = async (to, newPassword) => {
  const mailOptions = {
    from: `"Poetree Publications" <${process.env.BREVO_EMAIL}>`,
    to,
    subject: "Your New Password for Poetree Account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
        <div style="text-align: center;">
          <img src="https://poetreepublications.com/poetree.png" alt="Poetree Logo" style="max-height: 100px; margin-bottom: 20px;" />
          <h2 style="color: #2c3e50;">Password Reset Successful</h2>
          <p style="font-size: 16px; color: #555;">Your new password is:</p>
          <div style="font-size: 30px; font-weight: bold; color: #e67e22; margin: 20px 0;">${newPassword}</div>
          <p style="font-size: 14px; color: #999;">Please log in using this password and change it after logging in.</p>
        </div>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="text-align: center; font-size: 12px; color: #aaa;">If you didn’t request this, please ignore this email.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendAccountActivationPendingEmail = async (to, name) => {
  const mailOptions = {
    from: `"Poetree Publications" <${process.env.BREVO_EMAIL}>`,
    to,
    subject: "Account Activation in Process",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #2c3e50;">Hello ${name},</h2>
        <p style="font-size: 16px; color: #555;">
          Thank you for verifying your email. Our team will review your details and contact you shortly.
        </p>
        <p style="font-size: 16px; color: #555;">
          Your account will be activated within <strong>24 to 48 hours</strong>.
        </p>
        <br/>
        <p style="font-size: 14px; color: #999;">- Poetree Publications Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
const sendActivationStatusEmail = async (to, name, isActivated) => {
  const subject = isActivated
    ? "Your Poetree Account Has Been Activated"
    : "Your Poetree Account Has Been Deactivated";

  const statusMessage = isActivated
    ? `<p style="font-size: 16px; color: #2ecc71;">Your account has been successfully <strong>activated</strong>.</p>`
    : `<p style="font-size: 16px; color: #e74c3c;">Your account has been <strong>deactivated</strong>. If you believe this is a mistake, please contact support.</p>`;

  const mailOptions = {
    from: `"Poetree Publications" <${process.env.BREVO_EMAIL}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #2c3e50;">Hello ${name},</h2>
        ${statusMessage}
        <br/>
        <p style="font-size: 14px; color: #999;">- Poetree Publications Team</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};


module.exports = {
  sendOTPEmail,
  sendNewPasswordEmail,
  sendAccountActivationPendingEmail,sendActivationStatusEmail
};
