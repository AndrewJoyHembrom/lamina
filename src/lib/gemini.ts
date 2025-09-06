import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
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

// console.log(await summarizeCommit(`
//     diff --git a/.vscode/settings.json b/.vscode/settings.json
// new file mode 100644
// index 0000000..6b0e5ab
// --- /dev/null
// +++ b/.vscode/settings.json
// @@ -0,0 +1,3 @@
// +{
// +    "postman.settings.dotenv-detection-notification-visibility": false
// +}
// \ No newline at end of file
// diff --git a/src/app/dashboard/page.tsx b/src/app/(protected)/dashboard/page.tsx
// similarity index 100%
// rename from src/app/dashboard/page.tsx
// rename to src/app/(protected)/dashboard/page.tsx
// diff --git a/src/app/(protected)/layout.tsx b/src/app/(protected)/layout.tsx
// new file mode 100644
// index 0000000..df52429
// --- /dev/null
// +++ b/src/app/(protected)/layout.tsx
// @@ -0,0 +1,29 @@
// +import { SidebarProvider } from "@/components/ui/sidebar";
// +import { UserButton } from "@clerk/nextjs";
// +import React from "react";
// +
// +type Props = {
// +  children: React.ReactNode;
// +};
// +
// +const SidebarLayout = ({ children }: Props) => {
// +  return (
// +    <SidebarProvider>
// +      {/* <AppSidebar/> */}
// +      <main className="m-2 w-full">
// +        <div className="border-sidebar-border bg-sidebar flex items-center gap-2 rounded-md border p-2 px-4 shadow">
// +          {/* <SearchBar/> */}
// +          <div className="ml-auto"></div>
// +          <UserButton />
// +        </div>
// +        <div className="h-4"></div>
// +        {/* main content */}
// +        <div className="border-sidebar-border bg-sidebar h-[calc(100vh-6rem)] overflow-y-scroll rounded-md border p-4 shadow">
// +          {children}
// +        </div>
// +      </main>
// +    </SidebarProvider>
// +  );
// +};
// +
// +export default SidebarLayout;
//     `));