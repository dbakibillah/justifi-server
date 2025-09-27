const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const bookedLawyerCollection = client.db("justiFi").collection("bookedLawyers");

router.get("/bookings", async (req, res) => {
    const cursor = bookedLawyerCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});

router.post("/bookings", async (req, res) => {
    const booking = req.body;
    const result = await bookedLawyerCollection.insertOne(booking);
    res.send(result);
});

module.exports = router;
