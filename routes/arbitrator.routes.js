const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const arbitratorCollection = client.db("justiFi").collection("arbitrators");
const userCollection = client.db("justiFi").collection("users");


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
    try {
        const { email } = req.params;
        const data = req.body;

        // Remove _id to prevent immutable field modification
        const { _id, ...updateData } = data;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).send({
                success: false,
                error: "No valid fields to update",
            });
        }

        // Update arbitrator collection
        const arbitratorResult = await arbitratorCollection.updateOne(
            { email },
            { $set: updateData }
        );

        // If arbitrator not found
        if (arbitratorResult.matchedCount === 0) {
            return res.status(404).send({
                success: false,
                error: "Arbitrator not found",
            });
        }

        // Update user collection (only name and image)
        const userUpdateData = {};
        if (data.name) userUpdateData.name = data.name;
        if (data.image) userUpdateData.image = data.image;

        if (Object.keys(userUpdateData).length > 0) {
            await userCollection.updateOne(
                { email },
                { $set: userUpdateData }
            );
        }

        res.send({
            success: true,
            message: "Arbitrator profile updated successfully",
        });
    } catch (error) {
        console.error("Error updating arbitrator profile:", error);
        res.status(500).send({
            success: false,
            error: "Internal server error",
        });
    }
});


module.exports = router;