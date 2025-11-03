const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

const arbitrationCollection = client.db("justiFi").collection("arbitrations");

// Simple function to create an arbitration ID
function createArbitrationId() {
    const time = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ARB-${time}-${random}`;
}

// POST: Create a new arbitration request
router.post("/arbitration-requests", verifyToken, async (req, res) => {
    try {
        const data = req.body;
        const userEmail = req.user.email;

        // Check if required fields are missing
        if (!data.category || !data.nature_of_dispute || !data.suit_value || !data.plaintiffs || !data.defendants) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields!"
            });
        }

        // Plaintiffs and Defendants must be an array with at least one person
        if (!Array.isArray(data.plaintiffs) || data.plaintiffs.length === 0) {
            return res.status(400).json({ success: false, message: "Add at least one plaintiff" });
        }
        if (!Array.isArray(data.defendants) || data.defendants.length === 0) {
            return res.status(400).json({ success: false, message: "Add at least one defendant" });
        }

        // Suit value must be a positive number
        if (isNaN(data.suit_value) || data.suit_value <= 0) {
            return res.status(400).json({ success: false, message: "Suit value must be a positive number" });
        }

        // Create unique arbitration ID
        const arbitrationId = createArbitrationId();

        // Prepare data to save in database
        const newArbitration = {
            arbitration_id: arbitrationId,
            category: data.category,
            nature_of_dispute: data.nature_of_dispute,
            suit_value: parseFloat(data.suit_value),
            submitting_date: new Date(),
            status: "pending",
            plaintiffs: data.plaintiffs,
            defendants: data.defendants,
            arbitrators: [],
            hearings: [],
            evidence: [],
            award: {
                award_id: "W-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
                date: null,
                decision: null,
                status: "Pending"
            },
            created_by: userEmail,
            created_at: new Date(),
            updated_at: new Date()
        };

        // Save to database
        await arbitrationCollection.insertOne(newArbitration);

        res.status(201).json({
            success: true,
            message: "Arbitration request submitted!",
            data: {
                arbitration_id: arbitrationId,
                status: "pending"
            }
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Something went wrong!" });
    }
});

// GET: Show my arbitration requests
router.get("/my-arbitrations", verifyToken, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const status = req.query.status;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let filter = {
            $or: [
                { "plaintiffs.email": userEmail },
                { "defendants.email": userEmail },
                { created_by: userEmail }
            ]
        };

        if (status) {
            filter.status = status;
        }

        const data = await arbitrationCollection.find(filter)
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await arbitrationCollection.countDocuments(filter);

        res.json({
            success: true,
            data,
            page,
            total,
            pages: Math.ceil(total / limit)
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to get arbitrations" });
    }
});

// GET: Single arbitration by ID
router.get("/my-arbitrations/:id", verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const userEmail = req.user.email;

        let filter;
        if (ObjectId.isValid(id)) {
            filter = { _id: new ObjectId(id) };
        } else {
            filter = { arbitration_id: id };
        }

        const arbitration = await arbitrationCollection.findOne(filter);

        if (!arbitration) {
            return res.status(404).json({ success: false, message: "Arbitration not found" });
        }

        // Only involved users or creator can view it
        const isInvolved =
            arbitration.plaintiffs.some(p => p.email === userEmail) ||
            arbitration.defendants.some(d => d.email === userEmail) ||
            arbitration.created_by === userEmail;

        if (!isInvolved) {
            return res.status(403).json({ success: false, message: "You are not allowed to see this" });
        }

        res.json({ success: true, data: arbitration });

    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to load arbitration details" });
    }
});

// PATCH: Cancel arbitration (only creator and only if status is pending)
router.patch("/my-arbitrations/:id/cancel", verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const userEmail = req.user.email;

        let filter;
        if (ObjectId.isValid(id)) {
            filter = { _id: new ObjectId(id), created_by: userEmail };
        } else {
            filter = { arbitration_id: id, created_by: userEmail };
        }

        const arbitration = await arbitrationCollection.findOne(filter);
        if (!arbitration) {
            return res.status(404).json({ success: false, message: "Arbitration not found" });
        }

        if (arbitration.status !== "pending") {
            return res.status(400).json({ success: false, message: "Only pending arbitrations can be cancelled" });
        }

        await arbitrationCollection.updateOne(filter, {
            $set: {
                status: "cancel",
                cancellation_reason: req.body.cancellation_reason || "Cancelled by user",
                cancelled_by: userEmail,
                cancelled_at: new Date()
            }
        });

        res.json({ success: true, message: "Arbitration cancelled" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to cancel" });
    }
});

module.exports = router;
