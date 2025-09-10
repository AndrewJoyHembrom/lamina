import { db } from '@/server/db';
import axios from 'axios';
import { Octokit } from 'octokit';
import { aiSummarizeCommit } from './gemini';

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

console.log("GITHUB_TOKEN set?", !!process.env.GITHUB_TOKEN);
const rate = await octokit.rest.rateLimit.get();
console.log("GitHub rate limit:", rate.data.rate);


type Response = {
    commitMessage: string;
    commitHash: string;
    commitAuthorName: string;
    commitAuthorAvatar: string;
    commitDate: string;
}

export const getCommitHashes = async (githubUrl: string) : Promise<Response[]> => { 
    const [ owner, repo ] = githubUrl.split('/').slice(-2)
    if (!owner || !repo) { 
        throw new Error(`Invalid GitHub URL: ${githubUrl}`);
    }
    const { data } = await octokit.rest.repos.listCommits({
        owner,
        repo,
    })

    const sortedCommits = data.sort((a: any, b: any) => new Date(b.commit.author?.date).getTime() - new Date(a.commit.author?.date).getTime()) as any[];

    return sortedCommits.slice(0, 15).map((commit: any) => ({
        commitMessage: commit.commit.message ?? "",
        commitHash: commit.sha as string,
        commitAuthorName: commit.commit.author?.name ?? "",
        commitAuthorAvatar: commit.author?.avatar_url ?? "",
        commitDate: commit.commit.author?.date ?? "",
    }));
}

export const pollCommits = async (projectId: string) => { 
    const {project, githubUrl} = await fetchProjectGithubUrl(projectId);
    const commitHashes = await getCommitHashes(githubUrl);
    const unprocessedcommits = await filterUnprocessedCommits(projectId, commitHashes);
    const summaryResponses = await Promise.allSettled(unprocessedcommits.map(commit => { 
        return summarizeCommit(githubUrl, commit.commitHash)
    }))
    const summaries = summaryResponses.map(res => res.status === 'fulfilled' ? res.value as string : "");
    
    const commits = await db.commit.createMany({
        data: summaries.map((summary, index) => { 
            console.log(`Processing commit: ${index}`);
            return {
                projectId: projectId,
                commitHash: unprocessedcommits[index]!.commitHash,
                commitMessage: unprocessedcommits[index]!.commitMessage,
                commitAuthorName: unprocessedcommits[index]!.commitAuthorName,
                commitAuthorAvatar: unprocessedcommits[index]!.commitAuthorAvatar,
                commitDate: unprocessedcommits[index]!.commitDate,
                summary,
            }
        })
    })
    
    return commits;

}

async function summarizeCommit(githubUrl: string, commitHash: string) { 
    // git the diff, then pass the diff into ai
    const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
        headers: {
            Accept: 'application/vnd.github.v3.diff',
        }
    })

    return await aiSummarizeCommit(data) || "";
}

async function fetchProjectGithubUrl(projectId: string) { 
    const project = await db.project.findUnique({
        where: { id: projectId },
        select: { githubUrl: true }
    })
    
    if (!project?.githubUrl) {
        throw new Error(`Project with ID ${projectId} does not have a GitHub URL.`);
    }

    return { project, githubUrl: project?.githubUrl};
}

async function filterUnprocessedCommits(projectId: string, commitHashes: Response[]) { 
    const processedCommits = await db.commit.findMany({
        where: { projectId },
    });
    const unprocessedcommits = commitHashes.filter(commit => 
        !processedCommits.some(processed => processed.commitHash === commit.commitHash)
    );

    return unprocessedcommits;
}

// await pollCommits("b017c30b-1ee4-4748-847e-94ea42ab4a3c").then(console.log)