const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.voxvdqi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send("Unauthorized!")
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send("Forbidden!")
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const productsCollection = client.db('powerToolsBuySell').collection('products');
        const usersCollection = client.db('powerToolsBuySell').collection('users');
        const categoryCollection = client.db('powerToolsBuySell').collection('category');
        const ordersCollection = client.db('powerToolsBuySell').collection('orders');
        const paymentsCollection = client.db('powerToolsBuySell').collection('payments');
        const wishlistCollection = client.db('powerToolsBuySell').collection('wishlist');

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.userType !== 'admin') {
                return res.status(403).send({ message: "Forbidden" })
            }
            next();
        }

        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.userType !== 'seller') {
                return res.status(403).send({ message: "Forbidden" })
            }
            next();
        }

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7 days' });
                return res.send({ accessToken: token })
            }
            res.status(401).send({ accessToken: '' })
        })

        app.post('/product', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

        app.get('/advertise', async (req, res) => {
            const query = { advertised: true };
            const advertise = await productsCollection.find(query).toArray();
            res.send(advertise)
        })

        app.put('/advertise', async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    advertised: true
                }
            };
            const options = { upsert: true };
            const result = await productsCollection.updateOne(query, updateDoc, options);
            res.send(result)
        })

        app.get('/myproduct', verifyJWT, verifySeller, async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email }
            const products = await productsCollection.find(query).toArray();
            res.send(products)
        })

        app.put('/myproduct/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const updateInfo = req.body;
            const updateName = updateInfo.name;
            const updatePrice = updateInfo.price;
            const updateDoc = {
                $set: {
                    name: updateName,
                    price: updatePrice
                }
            }
            const options = { upsert: true };
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        app.delete('/myproduct/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        })

        app.get('/category/:id', async (req, res) => {
            const categoryId = req.params.id;
            const categoryQuery = { _id: ObjectId(categoryId) }
            const category = await categoryCollection.findOne(categoryQuery);
            const query = category.name === "All Products" ? {} : { category: category.name };
            const products = await productsCollection.find(query).toArray();
            res.send({ category: category.name, products });
        })

        app.get('/category', async (req, res) => {
            const query = {};
            const categories = await categoryCollection.find(query).toArray();
            res.send(categories)
        })

        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = parseInt(price.substring(1)) * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.orderId;
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await ordersCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { userEmail: email };
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders);
        })

        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await ordersCollection.findOne(query);
            res.send(order)
        })


        app.post('/orders', verifyJWT, async (req, res) => {
            const orderedProduct = req.body;

            const result = await ordersCollection.insertOne(orderedProduct);
            res.send(result);
        })

        app.delete('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/mywishtlist', async (req, res) => {
            const email = req.query.email;
            const query = { userEmail: email };
            const myWishListItems = await wishlistCollection.find(query).toArray();
            res.send(myWishListItems);
        })

        app.post('/mywishlist', verifyJWT, async (req, res) => {
            const item = req.body;
            const result = await wishlistCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/mywishlist/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await wishlistCollection.deleteOne(query);
            res.send(result)
        })


        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            if (user?.userType === 'admin') {
                res.send({ isAdmin: user?.userType === 'admin' })
            } else {
                res.send({ isSeller: user?.userType === 'seller' })
            }
        })

        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            const user = userInfo.usrInfo;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.get('/sellers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { userType: 'seller' };
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers)
        })

        app.delete('/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)

        })

        app.get('/buyers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { userType: 'buyer' };
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers)
        })

        app.delete('/buyers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)

        })
    }
    finally {

    }
}

run().catch(console.log)

app.get('/', (req, res) => {
    res.send('Power Tools Buy-Sell Server is running.')
})

app.listen(port, () => {
    console.log(`Server running on ${port}`);
})