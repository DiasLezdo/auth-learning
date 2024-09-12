const nodeMailer = require("nodemailer");

const sendMail = async (subject, message, send_to, sent_from, reply_to) => {
  // create email transporter
  const transporter = nodeMailer.createTransport({
    host: process.env.EMAIL_HOST,
    // service: "gamil",
    secure: true,
    port: 465,
    // tls: {
    //   ciphers: "SSLv3",
    //   // rejectUnauthorized: false,
    // },
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  // options from sending email
  const options = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    subject: subject,
    html: message,
  };

  //   send the email and if success or not
  // info is success parameter and it have some property

  transporter.sendMail(options, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
};

module.exports = sendMail;
