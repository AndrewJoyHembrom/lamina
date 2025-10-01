import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document } from 'langchain/document';
import { text } from 'stream/consumers';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
});

export const aiSummarizeCommit = async (diff: string) => {
  const prompt = `
You are an expert programmer, and you are trying to summarize a git diff. 
Reminders about the git diff format:
For every file, there are a few metadata lines, like (for example):
\`\`\`
diff --git a/lib/index.js b/lib/index.js
index 83db48f..f735c2d 100644
--- a/lib/index.js
+++ b/lib/index.js
\`\`\`
This means that 'lib/index.js' was modified in this commit. Note that this is only an example.
There is a specifier of the lines that were modified.
A line starting with \`+\` means that the line was added.
A line starting with \`-\` means that the line was removed.
A line that starts with neither \`+\` nor \`-\` is context code and not part of the diff.

EXAMPLE SUMMARY COMMENTS:
\`\`\`
* Raise the amount of return recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
* Fixed a type in the github action name. [.github/workflows/gpt-commit-summarizer.yml]
* Moved the \`octokit\` initialization to a separate file [packages/octokit.ts], [src/index.ts]
* Added an OpenAI API for completions [packages/utils/apis/openai.ts]
* Lowered numeric tolerance for files.
\`\`\`

Most commits will have fewer comments than this examples list.
The last comment does not include the file names,
because there were more than two relevant files in the hypothetical commit.

Do not include parts of the example in your summary.
It is given only as an example of appropriate comments.

Please summarize the following diff file: 

${diff}
  `;

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  return response.response.text();
};

export async function summarizeCode(doc: Document) {
  console.log("getting summary for: ", doc.metadata.source)
  try {
    const code = doc.pageContent.slice(0, 10000);
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
    {text: `You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects.
    You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file.
    Here is the code:
    ---
    ${code}
    ---
    Give a summary no more than 100 words of the code above
    `}
    ]
        }
      ]
    });
    return response.response.text();
  } catch (e) { 
    return ''
  }
}

export async function generateEmbedding(summary: string) { 
  const model = genAI.getGenerativeModel({
    model: 'text-embedding-004',
  });
  const result = await model.embedContent(summary);
  const embedding = result.embedding;
  return embedding.values;
}
