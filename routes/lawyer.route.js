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

router.get("/lawyerProfile", verifyToken, async (req, res) => {
    const { email } = req.query;
    const lawyer = await lawyerCollection.findOne({ email });
    res.send(lawyer);
});

// update lawyer profile
router.patch("/lawyerProfile/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    // Validate the ID
    if (!ObjectId.isValid(id)) {
        return res.status(400).send({
            success: false,
            error: "Invalid lawyer ID",
        });
    }

    // Remove _id from the update data to prevent immutable field modification
    const { _id, ...updateData } = data;

    // If there's nothing left to update after removing _id
    if (Object.keys(updateData).length === 0) {
        return res.status(400).send({
            success: false,
            error: "No valid fields to update",
        });
    }

    const result = await lawyerCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
    );

    if (result.matchedCount === 0) {
        return res.status(404).send({
            success: false,
            error: "Lawyer not found",
        });
    }

    res.send({
        success: true,
        message: "Lawyer profile updated successfully",
    });
});

module.exports = router;
