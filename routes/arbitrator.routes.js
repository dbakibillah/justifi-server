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

// Get arbitrator by email
router.get("/email/:email", async (req, res) => {
    try {
        const { email } = req.params;
        
        console.log("Fetching arbitrator by email:", email);

        if (!email) {
            return res.status(400).json({ 
                success: false,
                error: "Email is required" 
            });
        }

        const arbitrator = await arbitratorCollection.findOne({ 
            email: email.toLowerCase().trim() 
        });
        
        if (!arbitrator) {
            return res.status(404).json({ 
                success: false,
                error: "Arbitrator not found" 
            });
        }

        res.json({
            success: true,
            arbitrator: arbitrator
        });

    } catch (error) {
        console.error("Error in /email/:email:", error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
});

module.exports = router;