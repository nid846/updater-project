const {createClient}= require('redis')

const redisClient = createClient()

// async function testRedis(){
//     redisClient.on('error',(err)=>{
//         console.log(err.message)
//     })
//     await redisClient.set("name","developer")
//     const value=await redisClient.get("name")
//     console.log(value)
// }
redisClient.on('error',(err)=>{
        console.log(err.message)
})

async function connectRedis(){
    if(!redisClient.isOpen){
        await redisClient.connect();
        console.log("redis connected")
    }
}
async function getCache(key){
    const value=await redisClient.get(key);
    if(!value) return null
    return JSON.parse(value)
}
async function setCache(key,value){
    await redisClient.set(key,JSON.stringify(value),{
        EX: 300
    })
}
module.exports={connectRedis,getCache,setCache}