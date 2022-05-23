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
        const reviewCollection=client.db("PC_Hunk").collection("reviews");
        const userCollection=client.db("PC_Hunk").collection("users");

        //Api for loading all pc-parts
        app.get('/tools',async(req,res)=>{
            const tools=await toolsCollection.find().toArray();
            res.send(tools)
        })

        //Api for inserting reviews into db
        app.post('/reviews',async(req,res)=>{
            const data=req.body;
            const reviews= await reviewCollection.insertOne(data);
            res.send({success:true,reviews});
        })

        //Api for loading Recent reviews for homepage
        app.get('/reviews',async(req,res)=>{
            const review=await reviewCollection.find({}).sort({$natural:-1}).toArray()
            res.send(review);
        })

          //Api for upsert login data into user db
      app.put("/user/:email",async(req,res)=>{
        const email=req.params.email;
        const filter={email:email};
        const options={upsert:true};
        const user=req.body;
        const updateDoc = {
          $set: user
        };
        const result= await userCollection.updateOne(filter,updateDoc,options);
        const token = jwt.sign({email:email},process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '7d' });
        res.send({result,token});
      });

      
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