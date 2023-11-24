import Dotenv from "dotenv";
import Bcrypt from "bcrypt";
import User from "../models/User.js";
import UserAccess from "../models/UserAccess.js";
import EmailExists from "../libraries/EmailExists.js";
import EmailValid from "../libraries/EmailValid.js";
import JsonWebToken from "jsonwebtoken";
import Token from "../libraries/Token.js";
import Mongoose from "mongoose";

const env = Dotenv.config().parsed;

const errorJwt = [
  "invalid signature",
  "jwt malformed",
  "jwt must be provided",
  "invalid token",
];

class AuthController {
  async register(req, res) {
    try {
      if (!req.body.fullname) {
        throw { code: 400, message: "FULLNAME_IS_REQUIRED" };
      } else if (!req.body.email) {
        throw { code: 400, message: "EMAIL_IS_REQUIRED" };
      } else if (!req.body.password) {
        throw { code: 400, message: "PASSWORD_IS_REQUIRED" };
      } else if (req.body.password.length < 6) {
        throw { code: 400, message: "PASSWORD_MINIMUM_6_CHARACTERS" };
      } else if (!EmailValid(req.body.email)) {
        throw { code: 400, message: "INVALID_EMAIL" };
      }

      const isEmailExists = await EmailExists(req.body.email);
      if (isEmailExists) {
        throw { code: 400, message: "EMAIL_ALREADY_EXIST" };
      }

      const salt = await Bcrypt.genSalt(10);
      const hash = await Bcrypt.hash(req.body.password, salt);

      const user = await User.create({
        fullname: req.body.fullname.toLowerCase(),
        email: req.body.email.toLowerCase(),
        password: hash,
      });
      if (!user) {
        throw { code: 500, message: "USER_REGISTER_FAILED" };
      }

      const sessionId = Mongoose.Types.ObjectId();

      //store user access
      const userAccess = await new UserAccess({
        userId: user._id,
        sessionId: sessionId,
        type: "login",
        statusToken: true,
        statusLogin: true,
        userAgent: req.headers["user-agent"],
      }).save();

      //generate token
      const token = new Token();
      let payload = { _id: userAccess._id };
      const accessToken = await token.AccessToken(payload);
      const refreshToken = await token.RefreshToken(payload);

      return res.status(200).json({
        status: true,
        message: "USER_REGISTER_SUCCESS",
        fullname: user.fullname,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      if (error.code > 500) {
        error.code = 400;
      }
      return res.status(error.code || 500).json({
        status: false,
        message: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      if (!req.body.email) {
        throw { code: 400, message: "EMAIL_IS_REQUIRED" };
      } else if (!req.body.password) {
        throw { code: 400, message: "PASSWORD_IS_REQUIRED" };
      }

      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        throw { code: 404, message: "USER_NOT_FOUND" };
      }

      const isPasswordValid = await Bcrypt.compareSync(
        req.body.password,
        user.password
      );
      if (!isPasswordValid) {
        throw { code: 400, message: "INVALID_PASSWORD" };
      }

      const sessionId = Mongoose.Types.ObjectId();

      //store user access
      const userAccess = await new UserAccess({
        userId: user._id,
        sessionId: sessionId,
        type: "login",
        statusToken: true,
        statusLogin: true,
        userAgent: req.headers["user-agent"],
      }).save();

      //generate token
      const token = new Token();
      let payload = { _id: userAccess._id };
      const accessToken = await token.AccessToken(payload);
      const refreshToken = await token.RefreshToken(payload);

      return res.status(200).json({
        status: true,
        message: "USER_LOGIN_SUCCESS",
        fullname: user.fullname,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      return res.status(error.code || 500).json({
        status: false,
        message: error.message,
      });
    }
  }

  async refreshToken(req, res) {
    try {
      if (!req.body.refreshToken) {
        throw { code: 400, message: "REFRESH_TOKEN_IS_REQUIRED" };
      }

      // Verify refresh token
      const jwtVerified = await JsonWebToken.verify(
        req.body.refreshToken,
        env.JWT_REFRESH_TOKEN_SECRET
      );

      //if token from other device then push logout
      const checkUserAccess = await UserAccess.findOne({
        _id: jwtVerified._id,
        userAgent: req.headers["user-agent"],
      });

      if (!checkUserAccess) {
        throw { message: "TOKEN_FROM_OTHER_DEVICES" };
      }

      //update status last userAccess
      const userAccess = await UserAccess.findOneAndUpdate(
        {
          _id: jwtVerified._id,
          statusToken: true,
        },
        { statusToken: false },
        { new: true }
      );

      //check is accessId active not found
      if (!userAccess) {
        throw { message: "jwt expired" };
      }

      //store user access
      const newUserAccess = await new UserAccess({
        userId: userAccess.userId,
        sessionId: userAccess.sessionId,
        type: "refresh-token",
        statusToken: true,
        userAgent: req.headers["user-agent"],
      }).save();

      const token = new Token();
      let payload = { _id: newUserAccess._id };
      const accessToken = await token.AccessToken(payload);
      const refreshToken = await token.RefreshToken(payload);

      return res.status(200).json({
        status: true,
        message: "REFRESH_TOKEN_SUCCESS",
        accessToken,
        refreshToken,
      });
    } catch (error) {
      if (error.message == "jwt expired") {
        error.code = 401;
        error.message = "REFRESH_TOKEN_EXPIRED";
      } else if (errorJwt.includes(error.message)) {
        error.message = "INVALID_REFRESH_TOKEN";
      }

      return res.status(error.code || 500).json({
        status: false,
        message: error.message,
      });
    }
  }

  async logout(req, res) {
    try {
      //update status last userAccess
      const userAccess = await UserAccess.findOneAndUpdate(
        {
          _id: req.jwt._id,
          statusToken: true,
        },
        {
          statusToken: false,
        },
        { new: true }
      );

      //check is UserAccessId active not found
      if (!userAccess) {
        throw { message: "jwt expired" };
      }

      //set statusLogin false
      const changeStatusLogin = await UserAccess.findOneAndUpdate(
        {
          sessionId: userAccess.sessionId,
          statusLogin: true,
        },
        {
          statusLogin: false,
        },
        { new: true }
      );

      //check is UserAccessId active not found
      if (!changeStatusLogin) {
        throw { message: "SESSION_ID_NOT_FOUND" };
      }

      return res.status(200).json({
        status: true,
        message: "LOGOUT_SUCCESS",
      });
    } catch (error) {
      if (error.message == "jwt expired") {
        error.code = 401;
        error.message = "ACCESS_TOKEN_EXPIRED";
      } else if (errorJwt.includes(error.message)) {
        error.message = "INVALID_ACCESS_TOKEN";
      }

      return res.status(error.code || 500).json({
        status: false,
        message: error.message,
      });
    }
  }
}

export default new AuthController();
