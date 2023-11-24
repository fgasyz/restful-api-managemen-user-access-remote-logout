import express from "express";
import AuthController from "../controllers/AuthController.js";
import ProfileController from "../controllers/ProfileController.js";
import JwtAuth from "../middlewares/JwtAuth.js";

const router = express.Router();

//Auth
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", [JwtAuth()], AuthController.logout);

//Profile
router.get("/profiles/user-access", [JwtAuth()], ProfileController.userAccess);
router.get("/profiles/log-login", [JwtAuth()], ProfileController.logLogin);
router.post(
  "/profiles/remote-logout/:userAccessId",
  [JwtAuth()],
  ProfileController.remoteLogout
);

export default router;
