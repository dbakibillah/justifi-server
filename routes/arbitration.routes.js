const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

const SSLCommerzPayment = require("sslcommerz-lts");

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false;

const arbitrationCollection = client.db("justiFi").collection("arbitrations");

function createUniqueArbitrationId() {
    const prefix = "ARB";
    const objectId = new ObjectId().toString();

    const part1 = objectId.slice(0, 5).toUpperCase();
    const part2 = parseInt(objectId.slice(5, 13), 16)
        .toString()
        .padStart(8, "0")
        .slice(0, 8);

    return `${prefix}-${part1}-${part2}`;
}

// Create arbitration case request from frontend arbitrationDetails (arbitration.jsx)
router.post("/arbitration-requests", verifyToken, async (req, res) => {
    try {
        const arbitrationDetails = req.body;
        const arbitrationId = createUniqueArbitrationId();

        const data = {
            total_amount: arbitrationDetails.processingFee,
            currency: "BDT",
            tran_id: arbitrationId,
            success_url: `http://localhost:5000/payment/success/${arbitrationId}`,
            fail_url: `http://localhost:5000/payment/fail/${arbitrationId}`,
            cancel_url: `http://localhost:5000/payment/fail/${arbitrationId}`,
            ipn_url: "http://localhost:3030/ipn",
            shipping_method: "Courier",
            product_name: "Computer.",
            product_category: "Electronic",
            product_profile: "general",
            cus_name: "Customer Name",
            cus_email: "mHmZV@example.com",
            cus_add1: "Dhaka",
            cus_add2: "Dhaka",
            cus_city: "Dhaka",
            cus_state: "Dhaka",
            cus_postcode: "1000",
            cus_country: "Bangladesh",
            cus_phone: "01711111111",
            cus_fax: "01711111111",
            ship_name: "Customer Name",
            ship_add1: "Dhaka",
            ship_add2: "Dhaka",
            ship_city: "Dhaka",
            ship_state: "Dhaka",
            ship_postcode: 1000,
            ship_country: "Bangladesh",
        };
        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        sslcz.init(data).then(async (apiResponse) => {
            // Redirect the user to payment gateway
            let GatewayPageURL = apiResponse.GatewayPageURL;
            res.send({ url: GatewayPageURL });

            arbitrationDetails.payment_status = false;
            arbitrationDetails.arbitration_status = "Pending";
            const arbitrationResult = await arbitrationCollection.insertOne(
                arbitrationDetails
            );
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong!",
        });
    }
});

router.post("/payment/success/:arbitrationId", async (req, res) => {
    const { arbitrationId } = req.params;
    const result = await arbitrationCollection.updateOne(
        { arbitrationId: arbitrationId },
        {
            $set: {
                payment_status: "success",
                paidAt: new Date(),
            },
        }
    );
});

router.post("/payment/fail/:arbitrationId", async (req, res) => {
    const { arbitrationId } = req.params;
    const result = await arbitrationCollection.updateOne(
        { arbitrationId: arbitrationId },
        {
            $set: {
                payment_status: "failed",
                paidAt: new Date(),
            },
        }
    );
});

router.post("/payment/cancel/:arbitrationId", async (req, res) => {
    const { arbitrationId } = req.params;
    const result = await arbitrationCollection.updateOne(
        { arbitrationId: arbitrationId },
        {
            $set: {
                payment_status: "canceled",
                paidAt: new Date(),
            },
        }
    );
});

//user get korbo
router.get("/currentArbitrations", async (req, res) => {
    const { email } = req.query;
    const user = await userCollection.findOne({ email });
    res.send(user);
});

// Get All arbitration cases
router.get("/all-arbitrations", async (req, res) => {
    const allArbitration = await arbitrationCollection.find();
    const result = await allArbitration.toArray();
    res.send(result);
});

// Get my arbitrations - FIXED VERSION
router.get("/myArbitrations", verifyToken, async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        // Get all arbitrations where user is plaintiff or defendant
        const allArbitrations = await arbitrationCollection
            .find({})
            .sort({ submissionDate: -1 })
            .toArray();

        //console.log("Total arbitrations found:", allArbitrations.length);

        // Filter arbitrations where user is involved
        const userArbitrations = allArbitrations.filter((arbitration) => {
            // Check plaintiffs
            if (arbitration.plaintiffs) {
                if (Array.isArray(arbitration.plaintiffs)) {
                    const isPlaintiff = arbitration.plaintiffs.some(
                        (plaintiff) => plaintiff && plaintiff.email === email
                    );
                    if (isPlaintiff) return true;
                } else {
                    // Handle object format {1: {...}, 2: {...}}
                    const plaintiffEntries = Object.values(
                        arbitration.plaintiffs
                    );
                    const isPlaintiff = plaintiffEntries.some(
                        (plaintiff) => plaintiff && plaintiff.email === email
                    );
                    if (isPlaintiff) return true;
                }
            }

            // Check defendants
            if (arbitration.defendants) {
                if (Array.isArray(arbitration.defendants)) {
                    const isDefendant = arbitration.defendants.some(
                        (defendant) => defendant && defendant.email === email
                    );
                    if (isDefendant) return true;
                } else {
                    // Handle object format {1: {...}, 2: {...}}
                    const defendantEntries = Object.values(
                        arbitration.defendants
                    );
                    const isDefendant = defendantEntries.some(
                        (defendant) => defendant && defendant.email === email
                    );
                    if (isDefendant) return true;
                }
            }

            return false;
        });

        res.json(userArbitrations);
    } catch (error) {
        console.error("Error in /myArbitrations:", error);
        res.status(500).json({ error: error.message });
    }
});

// routes/arbitrations.js - Add this route
router.get("/my-arbitrations/:id", verifyToken, async (req, res) => {
    console.log("arbitration id : ", req.query);
    try {
        const caseId = req.params.id;
        const { email } = req.query;

        console.log("Fetching arbitration:", caseId, "for email:", email);

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        let query;
        if (ObjectId.isValid(caseId)) {
            query = { _id: new ObjectId(caseId) };
        } else {
            query = { arbitrationId: caseId };
        }

        const arbitration = await arbitrationCollection.findOne(query);

        if (!arbitration) {
            return res.status(404).json({ error: "Arbitration not found" });
        }

        // Check if user has access to this arbitration
        let hasAccess = false;

        // Check plaintiffs
        if (arbitration.plaintiffs) {
            if (Array.isArray(arbitration.plaintiffs)) {
                hasAccess = arbitration.plaintiffs.some(
                    (plaintiff) => plaintiff && plaintiff.email === email
                );
            } else {
                const plaintiffEntries = Object.values(arbitration.plaintiffs);
                hasAccess = plaintiffEntries.some(
                    (plaintiff) => plaintiff && plaintiff.email === email
                );
            }
        }

        // Check defendants if not already found
        if (!hasAccess && arbitration.defendants) {
            if (Array.isArray(arbitration.defendants)) {
                hasAccess = arbitration.defendants.some(
                    (defendant) => defendant && defendant.email === email
                );
            } else {
                const defendantEntries = Object.values(arbitration.defendants);
                hasAccess = defendantEntries.some(
                    (defendant) => defendant && defendant.email === email
                );
            }
        }

        if (!hasAccess) {
            return res
                .status(403)
                .json({ error: "Access denied to this arbitration" });
        }

        res.json(arbitration);
    } catch (error) {
        console.error("Error in /my-arbitrations/:id:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
