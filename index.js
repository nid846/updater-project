require('dotenv').config()
// app.set('view engine','ejs')

const session = require("express-session");

const express = require('express')
const app = express()

const { startCommitCron } = require("./cron/commitCron");
startCommitCron();

// app.use('/webhook', express.raw({ type: 'application/json' }));
// app.use(express.json())
// 1. Apply RAW body ONLY to webhook
app.use('/github/webhook', express.raw({ type: 'application/json' }));

// 2. Apply JSON to everything else
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

const {connectRedis}=require('./utils/redisClient')

const portfolioRoutes = require('./routes/projRoutes')
const errorHandler=require('./utils/errorHandler')

const port = process.env.port
app.set('view engine', 'ejs');
app.set('views', './views');

app.use('/', portfolioRoutes)
app.use(errorHandler)

async function startServer(){
    await connectRedis()
    app.listen(port,()=>{
        console.log(`server running on port ${port}`)
    })
}

startServer()

