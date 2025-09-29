const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const bookedLawyerCollection = client.db("justiFi").collection("bookedLawyers");

router.get("/bookings", async (req, res) => {
    const cursor = bookedLawyerCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});

router.post("/bookings", async (req, res) => {
    const booking = req.body;
    const result = await bookedLawyerCollection.insertOne(booking);
    res.send(result);
});

// Get appointments for a specific lawyer
router.get("/myAppointments", verifyToken, async (req, res) => {
    const { email } = req.query;

    // Query by lawyer email from the nested lawyer object
    const query = { "lawyer.email": email };
    const cursor = bookedLawyerCollection.find(query);
    const result = await cursor.toArray();

    res.send(result);
});

router.patch("/appointments/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { status, updatedAt, meetingLink, cancellationNote } = req.body;

    if (!ObjectId.isValid(id)) {
        return res.status(400).send({
            success: false,
            error: "Invalid appointment ID",
        });
    }

    const validStatuses = [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "rejected",
    ];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).send({
            success: false,
            error:
                "Invalid status. Must be one of: " + validStatuses.join(", "),
        });
    }

    const currentAppointment = await bookedLawyerCollection.findOne({
        _id: new ObjectId(id),
    });

    if (!currentAppointment) {
        return res.status(404).send({
            success: false,
            error: "Appointment not found",
        });
    }

    const updateData = {
        $set: {
            status: status,
            updatedAt: updatedAt || new Date().toISOString(),
        },
    };

    if (status === "confirmed" && meetingLink) {
        updateData.$set["booking.meetingLink"] = meetingLink;
    }

    if (status === "cancelled" && cancellationNote) {
        updateData.$set["booking.cancellationNote"] = cancellationNote;
    }

    const result = await bookedLawyerCollection.updateOne(
        { _id: new ObjectId(id) },
        updateData
    );

    if (result.matchedCount === 0) {
        return res.status(404).send({
            success: false,
            error: "Appointment not found",
        });
    }

    res.send({
        success: true,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        message: `Appointment status updated to ${status}`,
        data: {
            status,
            meetingLink: status === "confirmed" ? meetingLink : undefined,
            cancellationNote:
                status === "cancelled" ? cancellationNote : undefined,
        },
    });
});

module.exports = router;
