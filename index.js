const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.voxvdqi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const productsCollection = client.db('powerToolsBuySell').collection('products');
        const usersCollection = client.db('powerToolsBuySell').collection('users');
        const categoryCollection = client.db('powerToolsBuySell').collection('category');

        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

        app.get('/myproduct', async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email }
            const products = await productsCollection.find(query).toArray();
            res.send(products)
        })

        app.put('/myproduct/:id', async (req, res) => {
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

        app.delete('/myproduct/:id', async (req, res) => {
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

        app.get('/sellers', async (req, res) => {
            const query = { userType: 'seller' };
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers)
        })

        app.get('/buyers', async (req, res) => {
            const query = { userType: 'buyer' };
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers)
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