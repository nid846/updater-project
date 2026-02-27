const axios=require('axios')
const { fileLoader } = require('ejs')

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
                // sha: commit.sha
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
module.exports={getRepositories,getCommits,getRepoName,AllCommits}