require('dotenv').config()
// app.set('view engine','ejs')

const express = require('express')
const app = express()

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json())

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

