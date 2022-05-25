const express = require('express');
const app = express();
const cors=require('cors')
const port = process.env.PORT||4000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster01.ok61t.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//JWT verify function
const verifyJwt=(req,res,next)=>{
    const authHeader=req.headers.authorization;
    if(!authHeader){
      return res.status(401).send({message:'UnAuthorized Access'});
    }
    const token=authHeader.split(' ')[1];
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
      if(err){
        return res.status(403).send({message:'Forbidden Access'});
      }
      req.decoded=decoded;
       next();
    });
  }
  

async function run(){
    try{
        await client.connect();
        console.log("Mongo is connected to HUNK");

        const toolsCollection=client.db("PC_Hunk").collection("tools");
        const reviewCollection=client.db("PC_Hunk").collection("reviews");
        const userCollection=client.db("PC_Hunk").collection("users");
        const orderCollection=client.db("PC_Hunk").collection("orders");

        //Api for loading all pc-parts
        app.get('/tools',async(req,res)=>{
            const tools=await toolsCollection.find().toArray();
            res.send(tools)
        })

        //Api for Updating All pc-parts
        app.put('/tools/:id',async(req,res)=>{
            const id=req.params.id;
            const filter={_id:ObjectId(id)};
            const options={upsert:true};
            const update=req.body;
            const updatedDoc = {
                $set: update
              };
              const result= await toolsCollection.updateOne(filter,updatedDoc,options);
              res.send(result);

        })
        //Api for loading single utility filered by _id
        app.get('/tools/:id',async(req,res)=>{
            const id=req.params.id;
            const filter={_id:ObjectId(id)};
            const result=await toolsCollection.findOne(filter);
            res.send(result);
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

      //Api for loading all users
      app.get('/user',verifyJwt,async(req,res)=>{
        const users=await userCollection.find().toArray();
        res.send(users);
      })

         //Api for making an user to admin
         app.put("/user/admin/:email",verifyJwt,async(req,res)=>{
          const email=req.params.email;
          const initiator=req?.decoded.email;

          const initiatorAccount=await userCollection.findOne({email:initiator});
          if(initiatorAccount.role==="Admin"){
            const filter={email:email};
            const updateDoc = {
              $set:{
                role:'Admin'
              }
            };
            const result= await userCollection.updateOne(filter,updateDoc);
           return res.send(result);
          }
         else{
          return res.status(403).send({message:'Forbidden'});
         }
        });

      //Api for verify admin
      app.get('/admin/:email',verifyJwt,async(req,res)=>{
        const email=req.params.email;
        const user=await userCollection.findOne({email:email});
        const isAdmin=user.role==="Admin";
        res.send({admin:isAdmin});
      })

      //Api for inserting oders into db
      app.post('/orders',async(req,res)=>{
        const product=req.body;
        const order=await orderCollection.insertOne(product);
        res.send(order);
      })
      //Api for loading all orders
      app.get('/orders',async(req,res)=>{
        const orders=await orderCollection.find().toArray();
        res.send(orders);
      })

         //Api for loading myOrders filtering by email to dashboard
         app.get('/myorder',verifyJwt,async(req,res)=>{
          const getEmail=req.query.email;
          const decodedEmail=req?.decoded.email;

          if(decodedEmail===getEmail){
            const query={email:getEmail};
            const myorder= await orderCollection.find(query).toArray();
            return res.send(myorder);
          }
          else{
            return res.status(403).send({message:'Forbidden User'})
          }
            
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