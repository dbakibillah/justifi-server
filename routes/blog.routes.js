const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const blogCollection = client.db("justiFi").collection("blogs");

router.get("/blog", async (req, res) => {
    const cursor = blogCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});

module.exports = router;
