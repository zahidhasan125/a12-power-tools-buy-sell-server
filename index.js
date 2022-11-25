const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());

// powerToolsAdmin:vJoudtGeIhjCL0kN


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.voxvdqi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const productsCollection = client.db('powerToolsBuySell').collection('products');
        const usersCollection = client.db('powerToolsBuySell').collection('users');
        const categoryCollection = client.db('powerToolsBuySell').collection('category');

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


        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            const user = userInfo.usrInfo;
            const result = await usersCollection.insertOne(user);
            res.send(result);
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