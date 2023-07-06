const Users = require("../models/userModel");
const Orders = require("../models/orderModel");
const Contact = require("../models/contactModel");
const Newsletter = require("../models/newsletterModel");
const { emailSend } = require("../services/mailer.js");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const userCtrl = {
  changePassword: async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = await Users.findOne({ _id: req.user._id });
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Your old password is wrong.",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
      }

      if (oldPassword == newPassword)
        return res
          .status(400)
          .send({ msg: "You must enter a new password", code: "0x0033" });

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await Users.findOneAndUpdate(
        { _id: req.user._id },
        { password: newPasswordHash }
      );
      res.status(200).json({
        success: true,
        message: "Password updated successfully !",
        code: "1x0014",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
  newsletter: async (req, res, next) => {
    try {
      var email = req.body.email;

      if (!validateEmail(email)) {
        return res.status(500).json({ msg: "Invalid email" });
      }
      var content = `Welcome to our newsletter subscribed with: ${email}`;
      var mail = {
        from: "",
        subject: "Kitchen Savvy Newsletter Subscription",
        to: email,
        text: content,
      };

      emailSend(mail);
      if (err) {
        res.status(400).json(err);
      } else {
        const contact = {
          email: email,
        };

        console.log("Newsletter subscription", contact);
        let newContact = new Newsletter(contact);
        newContact.save();
        res.status(200).json({
          success: true,
          message: "Newsletter subscription successfully",
          contact,
        });
      }
    } catch (error) {
      logger.log("error", `newseltter subscription  =  ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  contact: async (req, res, next) => {
    const { email, subject } = req.body;
    try {
      let mailOptions = {
        from: `${email}`,
        to: "",
        subject: "New Contact",
        html: `<p><b>Client's email is:</b> ${email}</p> <br></br> <b>Subject is: </b> ${subject} `,
      };
      emailSend(mailOptions);
      if (error) {
        console.log(error);
        return res.status(400).send("Mailer Error!");
      }
      res.status(200).send("Email Sent!");
      console.log("Message sent: %s", info.messageId);
      const contact = {
        email: email,
        subject: subject,
      };

      let newContact = new Contact(contact);
      newContact.save();
      res.status(200).json({
        success: true,
        message: "Contact sent successfully",
        contact,
      });
    } catch (err) {
      res.status(500).send("Error !");
    }
  },

  createCheckout: async (req, res, next) => {
    try {
      const user = await Users.findById(req.user.id).select("-password");
      console.log(user);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: "You need to login",
        });
      }

      const price_id = req.body.price_id;
      const name = req.body.name;

      console.log(price_id);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: price_id,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.CLIENT_URL}/success/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/error`,
      });

      let currentPlan = "";
      if (price_id == "price_1N6X6dBwRCSfgWaX9vLQfROa") {
        currentPlan = "Monthly Starter";
      }
      if (price_id == "price_1N6X6sBwRCSfgWaXq9lLMlz2") {
        currentPlan = "Annually Starter";
      }
      if (price_id == "price_1N6X7IBwRCSfgWaXLvsJdkJS") {
        currentPlan = "Monthly Master Chief";
      }
      if (price_id == "price_1N6X7IBwRCSfgWaXeZYJ8V5D") {
        currentPlan = "Annually Master Chief";
      }

      const newOrder = new Orders({
        price_id: price_id,
        name,
        user: user,
        status: "Pending payment",
        plan: currentPlan,
      });

      const order = await newOrder.save();

      user.orders.push(order);
      user.currentPlan = currentPlan;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Session URL",
        url: session.url,
        order,
        user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
  checkPaymentStatus: async (req, res) => {
    const { sessionId } = req.params;

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      let idUser;

      const user = await Users.findById(req.user.id).select("-password");
      let creditsToAdd = 0;
      let puchasedCredits = 0;

      if (user.currentPlan === "Monthly Starter") {
        creditsToAdd = 250;
        puchasedCredits = 500;
      } else if (user.currentPlan === "Annually Starter") {
        creditsToAdd = 3000;
        puchasedCredits = 6000;
      } else if (user.currentPlan === "Monthly Master Chief") {
        creditsToAdd = 1000;
        puchasedCredits = 2000;
      } else if (user.currentPlan === "Annually Master Chief") {
        creditsToAdd = 6000;
        puchasedCredits = 12000;
      }

      if (user) {
        idUser = user._id;
      } else {
        res.status(400).json({
          success: false,
          message: "User not found",
        });
      }
      console.log("session", session);
      if (session.payment_status === "paid") {
        const order = await Orders.findOne({ user: req.user.id });

        order.status = "Paid";
        await order.save();
        const userCredits = await Users.findById(req.user.id);

        let currentCredits = userCredits.credits;
        console.log("currentCredits", currentCredits);
        console.log("creditsToAdd", creditsToAdd);

        let totalCredits = currentCredits + creditsToAdd;

        console.log("totalCredits", totalCredits);

        const user = await Users.findOneAndUpdate(
          { _id: idUser },
          {
            $set: {
              subscriptionStatus: true,
              customer: session.customer,
              customer_city: session.customer_details.address.city,
              customer_country: session.customer_details.address.country,
              customer_line1: session.customer_details.address.line1,
              customer_postal: session.customer_details.address.postal_code,
              customer_state: session.customer_details.address.state,
              customer_email: session.customer_details.email,
              customer_name: session.customer_details.name,
              customer_phone: session.customer_details.phone,
              subscriptionId: session.subscription,
              invoiceId: session.invoice,
              credits: totalCredits,
              purchasedCredits: puchasedCredits,
            },
          }
        );

        if (user) {
          res.status(200).json({
            success: true,
            message: "Payment was successful and account status updated",
          });
        } else {
          res.status(400).json({
            success: false,
            message: "Unable to update account status",
          });
        }
      } else {
        res
          .status(400)
          .json({ success: false, message: "Payment still pending" });
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      res
        .status(500)
        .json({ success: false, message: "Error checking payment status" });
    }
  },

  getUserInforWeb: async (req, res, next) => {
    try {
      const user = await Users.findById(req.user.id).select("-password");

      console.log(user);
      res.status(200).json({
        success: true,
        message: "User Information",
        user,
        code: "1x0014",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const { name, website, instagram, youtube } = req.body;
      const user = await Users.findById(req.user.id).select("-password");

      const updateFields = {};
      if (name) updateFields.name = name;
      if (website) updateFields.website = website;
      if (instagram) updateFields.instagram = instagram;
      if (youtube) updateFields.youtube = youtube;

      await Users.findOneAndUpdate({ _id: user }, updateFields);
      res.status(200).json({
        success: true,
        message: "Fields updates successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
};

module.exports = userCtrl;
