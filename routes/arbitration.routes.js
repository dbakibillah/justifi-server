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
            fail_url: "http://localhost:5000/payment/fail",
            cancel_url: "http://localhost:5000/payment/fail",
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
            
            const arbitrationResult = await arbitrationCollection.insertOne(
                arbitrationDetails
            );
        });
    } catch (error) {
        console.error("Error saving arbitration arbitrationDetails:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create arbitration case",
        });
    }
});

router.post("/payment/success/:arbitrationId", async (req, res) => {
    const { arbitrationId } = req.params;
    const result = await arbitrationCollection.updateOne(
        { arbitrationId: arbitrationId },
        { $set: { payment_status: true } }
    );
    const newArbitration = await arbitrationCollection.findOne({
        arbitrationId: arbitrationId,
    });

    if (result.matchedCount > 0) {
        res.redirect(
            `http://localhost:5173/payment-success?arbitrationId=${arbitrationId}`
        );
    }
});

router.post("/payment/fail", (req, res) => {
    res.redirect("http://localhost:5173/payment-failed");
});

// top code denotes : initial request create done.
//finish of arbitration request form arbitrationDetails process or store in db

// Get my arbitration cases (simple version without pagination)
router.get("/my-arbitrations", verifyToken, async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Find cases where user is involved
        const myCases = await arbitrationCollection
            .find({
                $or: [
                    { "plaintiffs.email": userEmail },
                    { "defendants.email": userEmail },
                ],
            })
            .toArray();

        res.json({
            success: true,
            arbitrationDetails: myCases,
            count: myCases.length,
        });
    } catch (error) {
        console.error("Error getting my arbitrations:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get your arbitration cases",
        });
    }
});

// Get single arbitration case by ID
router.get("/my-arbitrations/:id", verifyToken, async (req, res) => {
    try {
        const caseId = req.params.id;
        const userEmail = req.user.email;

        let query = { arbitration_id: caseId };

        const arbitrationCase = await arbitrationCollection.findOne(query);

        if (!arbitrationCase) {
            return res.status(404).json({
                success: false,
                message: "Arbitration case not found",
            });
        }

        // Check if user has access to this case
        const isPlaintiff = arbitrationCase.plaintiffs.some(
            (p) => p.email === userEmail
        );
        const isDefendant = arbitrationCase.defendants.some(
            (d) => d.email === userEmail
        );

        if (!isPlaintiff && !isDefendant) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to view this case",
            });
        }

        res.json({
            success: true,
            arbitrationDetails: arbitrationCase,
        });
    } catch (error) {
        console.error("Error getting arbitration case:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get arbitration case details",
        });
    }
});

module.exports = router;
