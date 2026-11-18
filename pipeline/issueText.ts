import type { RawIssue } from "../shared/types.ts";

/** The issue as plain text for a prompt. The body is wrapped in tags so the model can tell data from instructions. */
export function issueText(issue: RawIssue): string {
  return [
    `Repository: ${issue.repo}`,
    `Title: ${issue.title}`,
    `Labels: ${issue.labels.length ? issue.labels.join(", ") : "none"}`,
    `Reactions: ${issue.reactions}`,
    `Comments: ${issue.comments}`,
    `Opened: ${issue.createdAt.slice(0, 10)}`,
    "<issue_body>",
    issue.body || "(empty)",
    "</issue_body>",
  ].join("\n");
}
