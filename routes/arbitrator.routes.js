const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const arbitratorCollection = client.db("justiFi").collection("arbitrators");

router.get("/arbitrators", async (req, res) => {
    const cursor = arbitratorCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});

// Get All Arbitrators from admin panel
router.get("/all-arbitrators", verifyToken, async (req, res) => {
    const cursor = arbitratorCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});

router.get("/ArbitratorProfile", verifyToken, async (req, res) => {
    const { email } = req.query;
    const arbitrator = await arbitratorCollection.findOne({ email });
    res.send(arbitrator);
});

// update lawyer profile
router.patch("/ArbitratorProfile/:email", verifyToken, async (req, res) => {
    const { email } = req.params;
    const data = req.body;

    // Remove _id from the update data to prevent immutable field modification
    const { _id, ...updateData } = data;

    // If there's nothing left to update after removing _id
    if (Object.keys(updateData).length === 0) {
        return res.status(400).send({
            success: false,
            error: "No valid fields to update",
        });
    }

    const result = await arbitratorCollection.updateOne(
        { email: email },
        { $set: updateData }
    );

    if (result.matchedCount === 0) {
        return res.status(404).send({
            success: false,
            error: "Arbitrator not found",
        });
    }

    res.send({
        success: true,
        message: "Arbitrator profile updated successfully",
    });
});

module.exports = router;