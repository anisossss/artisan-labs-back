const nodeMailer = require("nodemailer");

exports.emailSend = async (emailData) => {
  const transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: false,
    auth: {
      user: "prolificseoteam@gmail.com",
      pass: "azfltjyusgnstvjp",
    },
  });
  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("SMTP ✅");
    }
  });
  try {
    const info = await transporter.sendMail(emailData);
    return console.log(`Message sent: ${info.response}`);
  } catch (err) {
    return console.log(`Problem sending email: ${err}`);
  }
};
