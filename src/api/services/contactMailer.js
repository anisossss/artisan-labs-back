const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: "duetodata123@gmail.com",
        pass: "wbffczxlvgmwemyx",
    }
});

const sendDemoRequest = (email, project) => {
    // Define the email options
    let mailOptions = {
        from: 'VALUE1ST <value1st@value1st.net>',
        to: 'anis@value1st.net',
        subject: 'A new potential client',
        html: `<p><b>Client's email is:</b> ${email}</p> <br></br> <b>Subject is: </b> ${project} `
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(400).send('Mailer Error!');
        }
        res.status(200).send('Email Sent!');
        console.log('Message sent: %s', info.messageId);
    });
}

module.exports = {sendDemoRequest};