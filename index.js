const express = require('express');
const app = express();
const cors=require('cors')
const port = process.env.PORT||4000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster01.ok61t.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run(){
    try{
        await client.connect();
        console.log("Mongo is connected to HUNK");

        const toolsCollection=client.db("PC_Hunk").collection("tools");

        //Api for loading all pc-parts
        app.get('/tools',async(req,res)=>{
            const tools=await toolsCollection.find().toArray();
            res.send(tools)
        })
    }
    finally{

    }
}

run().catch(console.dir);


app.get("/",(req,res)=>{
    res.send("PC_HUNK IS CONNECED....WITH SERVER");
})

app.listen(port, () => {
    console.log(`Hunk MAMA is listening on port ${port}`)
  })