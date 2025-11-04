const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

const arbitrationCollection = client.db("justiFi").collection("arbitrations");

// Create arbitration case request from frontend data (arbitration.jsx)
router.post("/arbitration-requests", verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const userEmail = req.user.email;

    // just check the received data from arbitratio.jsx file (means request body data)
    console.log("Received data from frontend:", data);

    // Validate required fields - none can be null or empty
    // if (!data.arbitrationId) {
    //     return res.status(400).json({
    //         success: false,
    //         message: "Arbitration ID is required"
    //     });
    // }

    async function createUniqueArbitrationId() {
      const prefix = "ARB";
      const objectId = new ObjectId().toString(); // unique 24-char hex string

      const part1 = objectId.slice(0, 5).toUpperCase(); // 5-char hex
      const part2 = parseInt(objectId.slice(5, 13), 16)
        .toString()
        .padStart(8, "0")
        .slice(0, 8); // 8-digit number

      return `${prefix}-${part1}-${part2}`;
    }

    if (!data.category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!data.natureOfDispute) {
      return res.status(400).json({
        success: false,
        message: "Nature of dispute is required",
      });
    }

    if (!data.suitValue || data.suitValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid suit value is required",
      });
    }

    if (!data.plaintiffs || data.plaintiffs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one plaintiff is required",
      });
    }

    if (!data.defendants || data.defendants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one defendant is required",
      });
    }

    if (!data.submissionDate) {
      return res.status(400).json({
        success: false,
        message: "Submission date is required",
      });
    }

     if (!data.title) {
      return res.status(400).json({
        success: false,
        message: "case title is required",
      });
    }

    // Use arbitration_id from frontend [check the uniqueness in the frontend before sending]
    const arbitrationId = await createUniqueArbitrationId();

    // Prepare data for database - all fields are required
    const arbitrationData = {
      arbitration_id: arbitrationId,
      category: data.category,
      nature_of_dispute: data.natureOfDispute,
      suit_value: data.suitValue,
      plaintiffs: data.plaintiffs,
      defendants: data.defendants,
      submitting_date: data.submissionDate,
      case_title: data.title,
      status: "pending", // Initial status when user submits
    };

    // Save to database
    const result = await arbitrationCollection.insertOne(arbitrationData);

    console.log("Data saved to database with ID:", result.insertedId);

    res.status(201).json({
      success: true,
      message: "Arbitration case created successfully!",
      arbitration_id: arbitrationId,
      status: "pending",
    });
  } catch (error) {
    console.error("Error saving arbitration data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create arbitration case",
    });
  }
});

// top code denotes : initial request create done.
//finish of arbitration request form data process or store in db

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
      data: myCases,
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
      data: arbitrationCase,
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
