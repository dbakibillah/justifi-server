const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const userCollection = client.db("justiFi").collection("users");

router.get("/users", async (req, res) => {
    const cursor = userCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});

router.get("/user", async (req, res) => {
    const { email } = req.query;
    const user = await userCollection.findOne({ email });
    res.json({ exists: !!user });
});

router.get("/currentUser", async (req, res) => {
    const { email } = req.query;
    const user = await userCollection.findOne({ email });
    res.send(user);
});

router.post("/users", async (req, res) => {
    const user = req.body;
    user.role = "user";
    const result = await userCollection.insertOne(user);
    res.send(result);
});

router.get("/userProfile", verifyToken, async (req, res) => {
    const { email } = req.query;
    const user = await userCollection.findOne({ email });
    res.send(user);
});

module.exports = router;
