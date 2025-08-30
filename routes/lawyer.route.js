const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const lawyerCollection = client.db("justiFi").collection("lawyers");

router.get("/lawyers", async (req, res) => {
    const cursor = lawyerCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});

module.exports = router;
