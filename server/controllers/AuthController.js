const { User } = require("../models/index");
const { comparePassword } = require("../helpers/bcrypt");
const { createToken } = require("../helpers/jwt");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

class AuthController {
  static async register(req, res, next) {
    try {
      console.log(req.body);
      const { email, password } = req.body;
      const user = await User.create({ email, password });
      res
        .status(201)
        .json({ message: `User with email ${user.email} has been created` });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // email & password validation
      if (!email) {
        throw { name: "InvalidEmail", field: "email" };
      }
      if (!password) {
        throw { name: "InvalidPassword", field: "password" };
      }

      // check existing user in database
      const user = await User.findOne({ where: { email } });
      // console.log(user);
      if (!user) {
        throw { name: "Unauthenticated" };
      }

      // check password match / not
      const compared = comparePassword(password, user.password);
      if (!compared) {
        throw { name: "Unauthenticated" };
      }

      // create jwt
      const access_token = createToken({ id: user.id });

      res.status(200).json({ access_token });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  static async googleLogin(req, res, next) {
    try {
      const { googleToken } = req.body;
      const client = new OAuth2Client();

      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const { email, sub } = ticket.getPayload();

      let user = await User.findOne({
        where: { email },
      });

      if (!user) {
        // create
        user = await User.create(
          {
            email,
            password: sub,
          },
          {
            hooks: false,
          }
        );
      }

      const access_token = createToken(user.id);
      res.status(200).json({ access_token, user });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
}

module.exports = AuthController;
