const axios=require('axios')
const { fileLoader } = require('ejs')
const pool=require("../db")
const username=process.env.GITHUB_USERNAME

const getRepos=(req,res)=>{} // this is a controller type function
// a service function : A helper that does a task and returns result. NO HTTP req and res

const getRepositories = async(username)=>{
    try{
        const response = await axios.get(`https://api.github.com/users/${username}/repos`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
                }
            }
        )
        const repos=response.data
        const filteredRepos = repos.map(repo=>{
            return {name: repo.name,desc:repo.description,
                stars:repo.stargazers_count,lang:repo.language,
                url:repo.html_url,up_at:repo.updated_at}
        })
        return filteredRepos
    } catch(error){
        console.log(error.message)
    }
}

const getCommits=async(owner,repo)=>{
    try{
        const response=await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
                }
            }
        )
        const commits=response.data;
        const filteredCommits=commits.map(commit=>{
            return{
                repo: repo,
                message: commit.commit.message,
                author: commit.commit.author.name,
                date: commit.commit.author.date,
                sha: commit.sha
            }
        })
        return filteredCommits
    }catch(error){
        if (error.response && error.response.status === 409) {
            // repo exists but no commits
            return []
        }
        console.log(error.message)
        return []
    }
}

const getRepoName=async(username)=>{
    try{
        const response=await axios.get(`https://api.github.com/users/${username}/repos`,{
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
            }
        })
        const repos=response.data
        const filteredRepos=repos.map(repo=>{
            return repo.name
        })
        return filteredRepos
    }catch(error){
        console.log(error.message)
    }
}

const AllCommits = async (username) => {
    const repoNames = await getRepoName(username)
    let allCommits = []
    for (const repo of repoNames) {
        const commit = await getCommits(username, repo)
        allCommits.push(...commit) // flatten array
    }
    const today = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(today.getDate() - 7)

    const last7DaysCommits = allCommits.filter(c => new Date(c.date) >= weekAgo)
    last7DaysCommits.sort((a, b) => new Date(b.date) - new Date(a.date))
    return last7DaysCommits
}

async function saveToDb(commits){
    for(const commit of commits){
        if(commit.message && commit.date && commit.repo){
            await pool.query(
                `INSERT INTO commits(repo,message,author,date,sha)
                VALUES($1 ,$2 ,$3 ,$4, $5)
                ON CONFLICT (sha) DO NOTHING`,
                [
                    commit.repo,commit.message,commit.author,commit.date,commit.sha
                ]
            )
        }
    }
} 

async function getLatestCommitsFromDB(limit = 10) {
  const result = await pool.query(
    `SELECT repo, message, author, date
     FROM commits
     ORDER BY date DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}
module.exports={getRepositories,getCommits,getRepoName,AllCommits,saveToDb,getLatestCommitsFromDB}