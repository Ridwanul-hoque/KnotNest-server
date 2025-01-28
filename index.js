const express = require('express');
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors')
const port = process.env.PORT || 5000;




app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8gt7g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const usersCollection = client.db("KnotNestDB").collection("users")
        const bioCollection = client.db("KnotNestDB").collection("Bio")
        const paymentCollection = client.db("KnotNestDB").collection("payment")
        const favouriteCollection = client.db("KnotNestDB").collection("favourites");






        // jwt
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        // middlewares
        const verifyToken = ((req, res, next) => {
            console.log('inside verify headers', req.headers);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ message: 'forbidden access' })

                }
                req.decoded = decoded
                next()
            })
        })
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }







        // users

        app.get('/users', async (req, res) => {
            console.log(req.headers)
            const result = await usersCollection.find().toArray();
            res.send(result)
        });
        app.get('/users', async (req, res) => {
            console.log(req.headers)
            const result = await usersCollection.find().toArray();
            res.send(result)
        });

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';

            }
            res.send({ admin })

        })
        app.patch('/users/admin/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })




        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        // app.get('/Bio', async (req, res) => {
        //     const result = await bioCollection.find().toArray()
        //     res.send(result)
        // })
        // Bio
        app.get('/Bio', async (req, res) => {
            const { age, biodataType, permanentDivision } = req.query;
            const filter = {};

            // Apply filters based on query params
            if (age) {
                const [minAge, maxAge] = age.split('-').map(Number);
                filter.age = { $gte: minAge, $lte: maxAge }; // Range-based filter
            }
            if (biodataType) {
                filter.biodataType = biodataType;
            }
            if (permanentDivision) {
                filter.permanentDivision = permanentDivision;
            }

            try {
                const result = await bioCollection.find(filter).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching bios:", error);
                res.status(500).send({ error: "Failed to fetch bios" });
            }
        });

        app.get('/Bio/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bioCollection.findOne(query)
            res.send(result)
        })


        app.post('/Bio', async (req, res) => {
            const biodata = req.body;
            try {
                const result = await bioCollection.insertOne(biodata);
                res.send(result);
            } catch (error) {
                console.error('Error adding biodata:', error);
                res.status(500).send('Internal Server Error');
            }
        });


        app.get('/Bio-email', async (req, res) => {
            const email = req.query.email;
            try {
                const result = await bioCollection.find({ email }).toArray();
                res.send(result);
            } catch (error) {
                console.error('Error fetching biodata:', error);
                res.status(500).send('Internal Server Error');
            }
        });
        app.put('/Bio-email', async (req, res) => {
            const email = req.query.email;
            const updatedBiodata = req.body;
            try {
                const result = await bioCollection.updateOne(
                    { email: email },
                    { $set: updatedBiodata }
                );
                if (result.matchedCount > 0) {
                    res.send({ message: "Biodata updated successfully", updatedBiodata });
                } else {
                    res.status(404).send({ message: "Biodata not found for the provided email" });
                }
            } catch (error) {
                console.error('Error updating biodata:', error);
                res.status(500).send('Internal Server Error');
            }
        });







        // payment
        // app.get("/isPremium/:email", async (req, res) => {
        //     const email = req.params.email;
        //     const result = await paymentCollection.findOne({ email, status: "approved" });
        //     res.send({ isPremium: !!result }); // Return true if premium
        // });

        // app.post("/payment", async (req, res) => {
        //     const paymentData = req.body;
        //     const result = await premiumCollection.insertOne(paymentData);
        //     res.send(result);
        // });




        // Handle payment and insert payment information into the DB








        app.post("/add-favorite", async (req, res) => {
            const { userEmail, biodataId } = req.body;
            try {
                // Check if the biodata already exists in the favorites
                const existingFavorite = await favouriteCollection.findOne({
                    userEmail: userEmail,
                    biodataId: biodataId,
                });

                if (existingFavorite) {
                    return res.status(400).send("This biodata is already in your favorites.");
                }

                // Fetch the full biodata details from the Bio collection
                const biodata = await bioCollection.findOne({ _id: new ObjectId(biodataId) });

                if (!biodata) {
                    return res.status(404).send("Biodata not found.");
                }

                // Create the new favorite object with full biodata details
                const newFavorite = {
                    userEmail,
                    biodataId,
                    name: biodata.name,
                    biodataType: biodata.biodataType,
                    profileImage: biodata.profileImage,
                    permanentDivision: biodata.permanentDivision,
                    age: biodata.age,
                    occupation: biodata.occupation,
                    email: biodata.email,
                    phone: biodata.phone,
                    timestamp: new Date(),
                };

                // Insert the full biodata into the favourites collection
                const result = await favouriteCollection.insertOne(newFavorite);
                res.send(result);
            } catch (error) {
                console.error("Error adding favorite:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        // Favourite collection: Get favourites for a specific user
        app.get('/favourites', async (req, res) => {
            const userEmail = req.query.email;

            // Check if the email exists in the query
            if (!userEmail) {
                return res.status(400).send({ message: 'Email query parameter is required.' });
            }

            try {
                // Find favourites for the given user email
                const favourites = await favouriteCollection.find({ userEmail }).toArray();

                // Send the favourites array (or an empty array if none found)
                res.send(favourites || []);
            } catch (error) {
                console.error('Error fetching favourites:', error);
                res.status(500).send({ message: 'Failed to fetch favourites.' });
            }
        });








        // favourite










        // Payment Collection Route
        app.post("/payment", async (req, res) => {
            const { userEmail, biodataId, amount, status } = req.body;

            if (!userEmail || !biodataId || !amount || !status) {
                return res.status(400).send({ error: "All fields are required" });
            }

            try {
                const paymentData = {
                    userEmail,
                    biodataId,
                    amount,
                    status: "pending", // Hardcoded status as "pending"
                    timestamp: new Date(),
                };

                const result = await paymentCollection.insertOne(paymentData);
                res.status(201).send(result);
            } catch (error) {
                console.error("Error processing payment:", error);
                res.status(500).send({ error: "Internal server error" });
            }
        });

        app.get('/payment', async (req, res) => {
            try {
                const payments = await paymentCollection.find({}).toArray();
                res.status(200).json(payments);
            } catch (error) {
                console.error('Error fetching payments:', error);
                res.status(500).json({ message: 'Failed to fetch payments' });
            }
        });

        // **PATCH** Route to Update Payment Status (approve)
        app.patch('/payment/approve/:id', async (req, res) => {
            const paymentId = req.params.id;
            const { status } = req.body;

            try {
                // Validate status
                if (status !== 'approved') {
                    return res.status(400).json({ message: 'Invalid status' });
                }

                const result = await paymentCollection.updateOne(
                    { _id: new ObjectId(paymentId) },
                    { $set: { status: status } }
                );

                if (result.modifiedCount > 0) {
                    res.status(200).json({ message: 'Payment status updated successfully' });
                } else {
                    res.status(404).json({ message: 'Payment not found' });
                }
            } catch (error) {
                console.error('Error updating payment:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        // Route to get biodata from payment collection
        app.get('/contact-request/:paymentId', async (req, res) => {
            const { paymentId } = req.params;

            try {
                // Get the payment info from the payment collection
                const payment = await paymentCollection.findOne({ _id: new ObjectId(paymentId) });

                if (!payment) {
                    return res.status(404).send({ message: 'Payment not found' });
                }

                // Check the status of the payment
                const status = payment.status;

                // Get biodata from Bio collection using the biodataId from the payment
                const biodata = await bioCollection.findOne({ _id: new ObjectId(payment.biodataId) });

                if (!biodata) {
                    return res.status(404).send({ message: 'Biodata not found' });
                }

                // Filter out phone and email if payment status is not 'approved'
                const filteredBiodata = {
                    ...biodata,
                    email: status === 'approved' ? biodata.email : undefined,
                    phone: status === 'approved' ? biodata.phone : undefined,
                };

                res.send(filteredBiodata);
            } catch (error) {
                console.error("Error fetching contact request:", error);
                res.status(500).send({ error: 'Failed to fetch contact request' });
            }
        });


        // // Admin Payment Approval Route
        // app.patch("/payment/approve/:paymentId", verifyToken, verifyAdmin, async (req, res) => {
        //     const paymentId = req.params.paymentId;
        //     const updatedStatus = { $set: { status: "approved" } };

        //     try {
        //         const result = await paymentCollection.updateOne(
        //             { _id: new ObjectId(paymentId) },
        //             updatedStatus
        //         );

        //         if (result.matchedCount > 0) {
        //             res.send({ success: true, message: "Payment approved successfully." });
        //         } else {
        //             res.status(404).send({ success: false, message: "Payment not found." });
        //         }
        //     } catch (error) {
        //         console.error("Error approving payment:", error);
        //         res.status(500).send({ success: false, message: "Internal Server Error" });
        //     }
        // });

        // Route to get biodata from payment collection
        app.get('/contact-request/:paymentId', async (req, res) => {
            const { paymentId } = req.params;

            try {
                // Get the payment info from the payment collection
                const payment = await paymentCollection.findOne({ _id: new ObjectId(paymentId) });

                if (!payment) {
                    return res.status(404).send({ message: 'Payment not found' });
                }

                // Check the status of the payment
                const status = payment.status;

                // Get biodata from Bio collection using the biodataId from the payment
                const biodata = await bioCollection.findOne({ _id: new ObjectId(payment.biodataId) });

                if (!biodata) {
                    return res.status(404).send({ message: 'Biodata not found' });
                }

                // Filter out phone and email if payment status is not 'approved'
                const filteredBiodata = {
                    ...biodata,
                    email: status === 'approved' ? biodata.email : undefined,
                    phone: status === 'approved' ? biodata.phone : undefined,
                };

                res.send(filteredBiodata);
            } catch (error) {
                console.error("Error fetching contact request:", error);
                res.status(500).send({ error: 'Failed to fetch contact request' });
            }
        });
        // Update payment status
        // app.patch('/payment/update-status/:id', async (req, res) => {
        //     const paymentId = req.params.id;

        //     try {
        //         // Find the payment document by ID
        //         const filter = { _id: new ObjectId(paymentId) };

        //         // Update the status field to "approved"
        //         const updateDoc = {
        //             $set: {
        //                 status: "approved",
        //             },
        //         };

        //         const result = await paymentCollection.updateOne(filter, updateDoc);

        //         // Check if the update was successful
        //         if (result.matchedCount > 0) {
        //             res.send({ success: true, message: "Status updated to approved successfully." });
        //         } else {
        //             res.status(404).send({ success: false, message: "Payment not found." });
        //         }
        //     } catch (error) {
        //         console.error("Error updating payment status:", error);
        //         res.status(500).send({ success: false, message: "Internal Server Error" });
        //     }
        // });



        // app.post('/create-payment-intent', async (req, res) => {
        //     const { price } = req.body;

        //     console.log('Received price:', price);

        //     // Validate price
        //     if (!price || isNaN(price)) {
        //         return res.status(400).send({ error: 'Invalid price provided' });
        //     }

        //     try {
        //         const amount = parseInt(price * 100, 10); // Convert to cents
        //         console.log('Amount in cents:', amount);

        //         const paymentIntent = await stripe.paymentIntents.create({
        //             amount: amount, // 5 USD = 500 cents
        //             currency: "usd", // USD currency
        //             payment_method_types: ['card'],
        //         });

        //         res.send({
        //             clientSecret: paymentIntent.client_secret,
        //         });
        //     } catch (error) {
        //         console.error('Error creating payment intent:', error);
        //         res.status(500).send({ error: 'Failed to create payment intent' });
        //     }
        // });
        // app.post("/create-payment-intent", async (req, res) => {
        //     const { price } = req.body;

        //     if (!price || isNaN(price)) {
        //         return res.status(400).send({ error: 'Invalid price provided' });
        //     }

        //     try {
        //         const amount = parseInt(price * 100, 10); // Convert to cents

        //         const paymentIntent = await stripe.paymentIntents.create({
        //             amount: amount, // 5 USD = 500 cents
        //             currency: "usd", // USD currency
        //             payment_method_types: ['card'],
        //         });

        //         res.send({
        //             clientSecret: paymentIntent.client_secret,
        //         });
        //     } catch (error) {
        //         console.error('Error creating payment intent:', error);
        //         res.status(500).send({ error: 'Failed to create payment intent' });
        //     }
        // });

        // Handle payment and insert payment information into the DB



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('matrimonial On')
})

app.listen(port, () => {
    console.log(`Matrimonial at ${port}`)
})