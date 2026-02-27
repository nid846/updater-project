require('dotenv').config()
// app.set('view engine','ejs')

const express = require('express')
const app = express()

const portfolioRoutes = require('./routes/projRoutes')
const errorHandler=require('./utils/errorHandler')

const port = process.env.port

app.use('/', portfolioRoutes)
app.use(errorHandler)

app.listen(port,()=>{
    console.log(`server running on port ${port}`)
})

