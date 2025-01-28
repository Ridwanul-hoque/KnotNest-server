const express = require('express');
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
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
        const favouriteCollection = client.db("KnotNestDB").collection("favourite")
       





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





        // payment
        app.get("/isPremium/:email", async (req, res) => {
            const email = req.params.email;
            const result = await paymentCollection.findOne({ email, status: "approved" });
            res.send({ isPremium: !!result }); // Return true if premium
          });
          
        app.post("/payment", async (req, res) => {
            const paymentData = req.body;
            const result = await premiumCollection.insertOne(paymentData);
            res.send(result);
        });



        // favourite












        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body
            const amount = parseInt(price * 100)

            console.log(amount, "amount inside the intent")

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

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