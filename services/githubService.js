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

async function saveToDb(commits, githubUsername){
    for(const commit of commits){
        if(commit.message && commit.date && commit.repo){
            await pool.query(
                `INSERT INTO commits(repo,message,author,date,sha, github_username)
                 VALUES($1 ,$2 ,$3 ,$4, $5, $6)
                 ON CONFLICT (sha) DO NOTHING`,
                [
                    commit.repo,commit.message,commit.author,commit.date,commit.sha,githubUsername
                ]
            )
        }
    }
}

async function getLatestCommitsFromDB(username, limit = 10) {
  const result = await pool.query(
    `SELECT repo, message, author, date
     FROM commits
     WHERE github_username = $1
     ORDER BY date DESC
     LIMIT $2`,
    [username, limit]
  );

  return result.rows;
}

async function saveSummary(username, summaryText) {
  await pool.query(
    `INSERT INTO summaries(username, summary, last_updated)
     VALUES($1, $2, NOW())
     ON CONFLICT(username) DO UPDATE
     SET summary = EXCLUDED.summary,
         last_updated = NOW()`,
    [username, summaryText]
  );
}

async function getSummary(username) {
  const res = await pool.query(
    `SELECT summary FROM summaries WHERE username = $1`,
    [username]
  );
  return res.rows[0]?.summary || null;
}

const saveDevSummary = async (username, summary) => {
  await pool.query(
    `INSERT INTO developer_summary (github_username, summary)
     VALUES ($1, $2)
     ON CONFLICT (github_username)
     DO UPDATE SET summary = EXCLUDED.summary`,
    [username, summary]
  );
};

const getDevSummary = async (username) => {
  const res = await pool.query(
    `SELECT summary FROM developer_summary WHERE github_username = $1`,
    [username]
  );
  return res.rows[0]?.summary;
};

const saveProjects = async (username, projects) => {
  await pool.query(
    `INSERT INTO projects (github_username, project_data)
     VALUES ($1, $2)
     ON CONFLICT (github_username)
     DO UPDATE SET project_data = EXCLUDED.project_data`,
    [username, JSON.stringify(projects)]
  );
};

const getProjects = async (username) => {
  const res = await pool.query(
    `SELECT project_data FROM projects WHERE github_username = $1`,
    [username]
  );
    const data = res.rows[0]?.project_data;
    if (!data) return [];
    return typeof data === "string" ? JSON.parse(data) : data;
};
module.exports={getRepositories,getCommits,getRepoName,AllCommits,saveToDb,getLatestCommitsFromDB,saveSummary,getSummary,saveDevSummary,getDevSummary,saveProjects,getProjects}