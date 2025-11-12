const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const mediatorCollection = client.db("justiFi").collection("mediators");

router.get("/mediators", async (req, res) => {
    const cursor = mediatorCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});

// Get All Mediators from admin panel
router.get("/all-mediators", verifyToken, async (req, res) => {
    const cursor = mediatorCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});

module.exports = router;
