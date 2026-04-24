const express = require("express");
const { getDashboardData } = require("../controllers/dashboardController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getDashboardData);

module.exports = router;