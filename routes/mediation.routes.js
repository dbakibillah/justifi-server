const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

const SSLCommerzPayment = require("sslcommerz-lts");

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false;

const mediationCollection = client.db("justiFi").collection("mediations");

function createUniqueMediationId() {
    const prefix = "MED";
    const objectId = new ObjectId().toString();

    const part1 = objectId.slice(0, 5).toUpperCase();
    const part2 = parseInt(objectId.slice(5, 13), 16)
        .toString()
        .padStart(8, "0")
        .slice(0, 8);

    return `${prefix}-${part1}-${part2}`;
}

// Create mediation case request from frontend mediationDetails (mediation.jsx)
router.post("/mediation-requests", verifyToken, async (req, res) => {
    try {
        const mediationDetails = req.body;
        const mediationId = createUniqueMediationId();

        const data = {
            total_amount: mediationDetails.processingFee,
            currency: "BDT",
            tran_id: mediationId,
            success_url: `http://localhost:5000/payment/success/${mediationId}`,
            fail_url: `http://localhost:5000/payment/fail/${mediationId}`,
            cancel_url: `http://localhost:5000/payment/cancel/${mediationId}`,
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

            mediationDetails.payment_status = false;

            const mediationResult = await mediationCollection.insertOne(
                mediationDetails
            );
        });
    } catch (error) {
        console.error("Error saving mediation mediationDetails:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create mediation case",
        });
    }
});

router.post("/payment/success/:mediationId", async (req, res) => {
    const { mediationId } = req.params;
    const result = await mediationCollection.updateOne(
        { mediationId: mediationId },
        {
            $set: {
                payment_status: "success",
                paidAt: new Date(),
            },
        }
    );
});

router.post("/payment/fail/:mediationId", async (req, res) => {
    const { mediationId } = req.params;
    const result = await mediationCollection.updateOne(
        { mediationId: mediationId },
        {
            $set: {
                payment_status: "failed",
                paidAt: new Date(),
            },
        }
    );
});

router.post("/payment/cancel/:mediationId", async (req, res) => {
    const { mediationId } = req.params;
    const result = await mediationCollection.updateOne(
        { mediationId: mediationId },
        {
            $set: {
                payment_status: "canceled",
                paidAt: new Date(),
            },
        }
    );
});

module.exports = router;
