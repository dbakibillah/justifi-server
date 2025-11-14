const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { client } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

const arbitratorCollection = client.db("justiFi").collection("arbitrators");
const userCollection = client.db("justiFi").collection("users");
const arbitrationCollection = client.db("justiFi").collection("arbitrations");
const Hearing=client.db("justiFi").collection("Hearing");

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







///write code for arbitrator (mehedi)
// GET arbitrations where user is presiding arbitrator
router.get('/arbitrations/presiding', async (req, res) => {
    try {
        //console.log('Received request for presiding arbitrator:', req.query);
        const { email } = req.query;

        // Validate email parameter
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email parameter is required'
            });
        }

        
        // Find arbitrations where the user is the presiding arbitrator
        const arbitrations = await arbitrationCollection.find({
            presidingArbitratorEmail: email
        }).sort({ submissionDate: -1 }).toArray(); // Sort by most recent first

       // console.log(`Found ${arbitrations.length} arbitrations for presiding arbitrator: ${email}`);

        // If no arbitrations found
        if (!arbitrations || arbitrations.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No arbitration cases found for this presiding arbitrator',
                data: []
            });
        }

        // Return successful response with arbitrations data
        res.status(200).json({
            success: true,
            message: 'Arbitration cases retrieved successfully',
            data: arbitrations,
            count: arbitrations.length
        });

    } catch (error) {
        console.error('Error fetching presiding arbitrations:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});




















//details backend stars here
// GET arbitration details by ID with arbitrator information
router.get('/arbitrations/details/:id', async (req, res) => {
     const { id } = req.params;
   // console.log('Fetching arbitration details for ID:', id);
    try {
       

        // Find arbitration by ID
        const arbitration = await arbitrationCollection.findOne({
            $or: [
                { _id: new ObjectId(id) },
                { arbitrationId: id }
            ]
        });

        if (!arbitration) {
            return res.status(404).json({
                success: false,
                message: 'Arbitration case not found'
            });
        }

        // Fetch arbitrator information using the correct email fields
        const arbitratorEmails = [
            arbitration.presidingArbitratorEmail, // presidingArbitratorEmail
            arbitration.arbitrator1Email,         // arbitrator1Email
            arbitration.arbitrator2Email          // arbitrator2Email
        ].filter(email => email); // Remove null/undefined emails

        let arbitratorsInfo = [];
        
        if (arbitratorEmails.length > 0) {
            arbitratorsInfo = await arbitratorCollection.find({
                email: { $in: arbitratorEmails }
            }).toArray();
        }

        // Create a map for quick lookup of arbitrator info by email
        const arbitratorMap = {};
        arbitratorsInfo.forEach(arbitrator => {
            arbitratorMap[arbitrator.email] = {
                name: arbitrator.name,
                image: arbitrator.image,
                specialization: arbitrator.specialization, // This is an array
                experience: arbitrator.experience,
                phone: arbitrator.phone,
                address: arbitrator.address,
                description: arbitrator.description,
                qualification: arbitrator.qualification,
                languages: arbitrator.languages, // This is an array
                gender: arbitrator.gender
            };
        });

        // Format the response with arbitrator details
        const formattedArbitration = {
            _id: arbitration._id,
            caseTitle: arbitration.caseTitle,
            caseCategory: arbitration.caseCategory,
            disputeNature: arbitration.disputeNature,
            suitValue: arbitration.suitValue,
            plaintiffs: arbitration.plaintiffs || [],
            defendants: arbitration.defendants || [],
            processingFee: arbitration.processingFee,
            submissionDate: arbitration.submissionDate,
            arbitrationId: arbitration.arbitrationId,
            arbitration_status: arbitration.arbitration_status,
            payment_status: arbitration.payment_status,
            agreementDate: arbitration.agreementDate,
            arbitrator1: arbitration.arbitrator1,
            arbitrator2: arbitration.arbitrator2,
            presidingArbitrator: arbitration.presidingArbitrator,
            complianceDays: arbitration.complianceDays,
            totalCost: arbitration.totalCost,
            sittings: arbitration.sittings,
            justifiDesignation: arbitration.justifiDesignation,
            justifiName: arbitration.justifiName,
            justifiEmail: arbitration.justifiEmail,
            // Arbitrators information
            arbitrators: [
                // Presiding Arbitrator
                arbitration.presidingArbitratorEmail ? {
                    id: 'presiding',
                    name: arbitratorMap[arbitration.presidingArbitratorEmail]?.name || arbitration.presidingArbitrator,
                    email: arbitration.presidingArbitratorEmail,
                    designation: 'Presiding Arbitrator',
                    picture: arbitratorMap[arbitration.presidingArbitratorEmail]?.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                    specialization: arbitratorMap[arbitration.presidingArbitratorEmail]?.specialization || ['Presiding Arbitrator'],
                    experience: arbitratorMap[arbitration.presidingArbitratorEmail]?.experience || 'Lead Arbitrator',
                    phone: arbitratorMap[arbitration.presidingArbitratorEmail]?.phone || '',
                    address: arbitratorMap[arbitration.presidingArbitratorEmail]?.address || '',
                    description: arbitratorMap[arbitration.presidingArbitratorEmail]?.description || '',
                    qualification: arbitratorMap[arbitration.presidingArbitratorEmail]?.qualification || '',
                    languages: arbitratorMap[arbitration.presidingArbitratorEmail]?.languages || [],
                    gender: arbitratorMap[arbitration.presidingArbitratorEmail]?.gender || ''
                } : null,
                
                // Arbitrator 1
                arbitration.arbitrator1Email ? {
                    id: 'arbitrator1',
                    name: arbitratorMap[arbitration.arbitrator1Email]?.name || arbitration.arbitrator1,
                    email: arbitration.arbitrator1Email,
                    designation: 'Arbitrator',
                    picture: arbitratorMap[arbitration.arbitrator1Email]?.image || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
                    specialization: arbitratorMap[arbitration.arbitrator1Email]?.specialization || ['Arbitrator'],
                    experience: arbitratorMap[arbitration.arbitrator1Email]?.experience || 'Panel Member',
                    phone: arbitratorMap[arbitration.arbitrator1Email]?.phone || '',
                    address: arbitratorMap[arbitration.arbitrator1Email]?.address || '',
                    description: arbitratorMap[arbitration.arbitrator1Email]?.description || '',
                    qualification: arbitratorMap[arbitration.arbitrator1Email]?.qualification || '',
                    languages: arbitratorMap[arbitration.arbitrator1Email]?.languages || [],
                    gender: arbitratorMap[arbitration.arbitrator1Email]?.gender || ''
                } : null,
                
                // Arbitrator 2
                arbitration.arbitrator2Email ? {
                    id: 'arbitrator2',
                    name: arbitratorMap[arbitration.arbitrator2Email]?.name || arbitration.arbitrator2,
                    email: arbitration.arbitrator2Email,
                    designation: 'Arbitrator',
                    picture: arbitratorMap[arbitration.arbitrator2Email]?.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
                    specialization: arbitratorMap[arbitration.arbitrator2Email]?.specialization || ['Arbitrator'],
                    experience: arbitratorMap[arbitration.arbitrator2Email]?.experience || 'Panel Member',
                    phone: arbitratorMap[arbitration.arbitrator2Email]?.phone || '',
                    address: arbitratorMap[arbitration.arbitrator2Email]?.address || '',
                    description: arbitratorMap[arbitration.arbitrator2Email]?.description || '',
                    qualification: arbitratorMap[arbitration.arbitrator2Email]?.qualification || '',
                    languages: arbitratorMap[arbitration.arbitrator2Email]?.languages || [],
                    gender: arbitratorMap[arbitration.arbitrator2Email]?.gender || ''
                } : null
            ].filter(arbitrator => arbitrator !== null) // Remove null arbitrators
        };

        res.status(200).json({
            success: true,
            message: 'Arbitration details retrieved successfully',
            data: formattedArbitration
        });

    } catch (error) {
        console.error('Error fetching arbitration details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});







//All Hearing code Here 

// POST /api/hearings/create
router.post('/hearings/create', async (req, res) => {
   // console.log(req.body); 
    try {
        const {
            arbitrationId,
            date,
            meetLink,
            hearingAgenda,
            duration = 120,
            createdBy
        } = req.body;

        // Validate required fields
        if (!arbitrationId || !date || !meetLink || !hearingAgenda || !createdBy) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: arbitrationId, date, meetLink, hearingAgenda, createdBy'
            });
        }

        // Check if arbitration exists
        const arbitration = await Arbitration.findOne({ arbitrationId });
        if (!arbitration) {
            return res.status(404).json({
                success: false,
                message: 'Arbitration not found'
            });
        }

        // Get the next hearing number
        const lastHearing = await Hearing.findOne({ arbitrationId })
            .sort({ hearingNumber: -1 });
        
        const hearingNumber = lastHearing ? lastHearing.hearingNumber + 1 : 1;

        // Generate hearing ID
        const hearingId = `ARB-HER-${Date.now()}`;

        // Create new hearing
        const newHearing = new Hearing({
            arbitrationId,
            hearingId,
            hearingNumber,
            date: new Date(date),
            duration,
            meetLink,
            hearingAgenda,
            status: 'scheduled',
            cancellationReason: '',
            createdBy,
            createdAt: new Date(),
            updatedAt: new Date(),
            arbitrator1Comment: '',
            arbitrator2Comment: '',
            presidingArbitratorComment: '',
            privateNotes: '',
            attendance: {
                arbitrator1: false,
                arbitrator2: false,
                presidingArbitrator: false,
                plaintiffs: [],
                defendants: []
            },
            recording: {
                recorded: false,
                recordingUrl: '',
                duration: '',
                fileSize: ''
            },
            documents: []
        });

        // Save hearing to database
       
        const savedHearing = await newHearing.save();
         console.log("all Data: ",newHearing); 
        // Update arbitration with new hearing reference
        await Arbitration.findOneAndUpdate(
            { arbitrationId },
            { 
                $push: { 
                    hearings: savedHearing._id 
                },
                $set: { 
                    updatedAt: new Date() 
                }
            }
        );

        res.status(201).json({
            success: true,
            message: 'Hearing created successfully',
            data: savedHearing
        });

    } catch (error) {
        console.error('Error creating hearing:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});



// GET /api/hearings/arbitration/:arbitrationId - Get all hearings for an arbitration
router.get('/hearings/arbitration/:arbitrationId', async (req, res) => {
    try {
        const { arbitrationId } = req.params;

        // Validate arbitrationId
        if (!arbitrationId) {
            return res.status(400).json({
                success: false,
                message: 'Arbitration ID is required'
            });
        }

        // Find all hearings for this arbitration, sorted by date (ascending)
        const hearings = await Hearing.find({ arbitrationId })
            .sort({ date: 1 })
            .select('-__v')
            .lean();

        // If no hearings found, return empty array
        if (!hearings || hearings.length === 0) {
            return res.json({
                success: true,
                message: 'No hearings found for this arbitration',
                data: []
            });
        }

        res.json({
            success: true,
            message: 'Hearings fetched successfully',
            data: hearings
        });

    } catch (error) {
        console.error('Error fetching hearings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// GET /api/hearings/:hearingId - Get single hearing by ID
router.get('/hearings/:hearingId', async (req, res) => {
    try {
        const { hearingId } = req.params;

        const hearing = await Hearing.findOne({ hearingId })
            .select('-__v')
            .lean();

        if (!hearing) {
            return res.status(404).json({
                success: false,
                message: 'Hearing not found'
            });
        }

        res.json({
            success: true,
            message: 'Hearing fetched successfully',
            data: hearing
        });

    } catch (error) {
        console.error('Error fetching hearing:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// PUT /api/hearings/:hearingId - Update hearing
router.put('/hearings/:hearingId', async (req, res) => {
    try {
        const { hearingId } = req.params;
        const updateData = req.body;

        // Remove immutable fields
        delete updateData._id;
        delete updateData.hearingId;
        delete updateData.arbitrationId;
        delete updateData.hearingNumber;
        delete updateData.createdBy;
        delete updateData.createdAt;

        // Add updatedAt timestamp
        updateData.updatedAt = new Date();

        const updatedHearing = await Hearing.findOneAndUpdate(
            { hearingId },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-__v');

        if (!updatedHearing) {
            return res.status(404).json({
                success: false,
                message: 'Hearing not found'
            });
        }

        res.json({
            success: true,
            message: 'Hearing updated successfully',
            data: updatedHearing
        });

    } catch (error) {
        console.error('Error updating hearing:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// DELETE /api/hearings/:hearingId - Delete hearing
router.delete('/hearings/:hearingId', async (req, res) => {
    try {
        const { hearingId } = req.params;

        const deletedHearing = await Hearing.findOneAndDelete({ hearingId });

        if (!deletedHearing) {
            return res.status(404).json({
                success: false,
                message: 'Hearing not found'
            });
        }

        // Remove hearing reference from arbitration
        await Arbitration.findOneAndUpdate(
            { arbitrationId: deletedHearing.arbitrationId },
            { 
                $pull: { 
                    hearings: deletedHearing._id 
                },
                $set: { 
                    updatedAt: new Date() 
                }
            }
        );

        res.json({
            success: true,
            message: 'Hearing deleted successfully',
            data: deletedHearing
        });

    } catch (error) {
        console.error('Error deleting hearing:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;