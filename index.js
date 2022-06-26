const express = require('express');
const app = express();
const cors=require('cors')
const port = process.env.PORT||4000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe= require('stripe')(process.env.STRIPE_KEY);

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
        const paymentCollection=client.db("PC_Hunk").collection("payments");
        const profileCollection=client.db("PC_Hunk").collection("profiles");

        //Api for loading all pc-parts
        app.get('/tools',async(req,res)=>{
            const tools=await toolsCollection.find().toArray();
            res.send(tools)
        })

        //Api for add a product
        app.put('/tools',async(req,res)=>{
          const body=req.body;
          const tools=await toolsCollection.insertOne(body);
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

        //Api for inserting profile into db
        app.post('/profile',async(req,res)=>{
          const data=req.body;
          const profile=await profileCollection.insertOne(data);
          res.send(profile);
        })
        //Api for loading a profile
        app.get('/profile/:email',async(req,res)=>{
          const email=req.params.email;
          const filter={email:email};
          const myprofile=await profileCollection.findOne(filter);
          res.send(myprofile);
        })
        //Api for updating profile into db
        app.put('/profile/:email',verifyJwt,async(req,res)=>{
          const email=req.params.email;
          const filter={email:email};
          const option={upsert:true};
          const data=req.body;
          const updateDoc = {
            $set: data
          };
          const updateProfile=await profileCollection.updateOne(filter,updateDoc,option);
          res.send(updateProfile);
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

      //Api for delete a user
      app.delete('/user/:email',verifyJwt,async(req,res)=>{
        const email=req.params.email;
        const filter={email:email};
        const removeUser=await userCollection.deleteOne(filter);
        res.send(removeUser);
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
        //Api for deleting Order
        app.delete('/order/:id',async(req,res)=>{
          const id=req.params.id;
          const filter={_id:ObjectId(id)};
          const removedata=await orderCollection.deleteOne(filter);
          res.send(removedata);
        })

      //Api for loading all orders
      app.get('/orders',verifyJwt,async(req,res)=>{
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

        //Api for loading selected order info to pay
        app.get('/myorder/:id',verifyJwt,async(req,res)=>{
          const id=req.params.id;
          const query={_id:ObjectId(id)};
          const orderInfo=await orderCollection.findOne(query);
          res.send(orderInfo);
        });

         // Api for payment collection and confirm payment 
      app.patch('/myorder/:id',verifyJwt,async(req,res)=>{
        const id=req.params.id;
        const filter={_id:ObjectId(id)};
        const paymentinfo=req.body;
        const updatedDoc={
          $set:{
            paid:true,
            transactionId:paymentinfo.transactionId,
          }
        }
        const orderUpdate=await orderCollection.updateOne(filter,updatedDoc);
        const payment=await paymentCollection.insertOne(paymentinfo);
        res.send({Update:orderUpdate,Payment:payment});
      });

       //api for stripe payment 
       app.post("/create-payment-intent", async (req, res)=>{
        const order=req.body;
        const price=order.duePrice;
        const amount=price*100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount:amount,
          currency:'usd',
          payment_method_types: ["card"],
        });
        res.send({clientSecret: paymentIntent.client_secret});
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