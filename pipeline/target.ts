/**
 * The one place that says which GitHub organization this run scores.
 * To point the tool at another org: change these three values, write a strategy summary
 * for that company at `strategyFile`, and run the pipeline.
 */
export const TARGET = {
  /** GitHub organization login, as in github.com/<org>. */
  org: "cloudinary",
  /** Company name as shown on the page. */
  company: "Cloudinary",
  /** Short summary of the company's public direction; Strategic Fit is scored against it. */
  strategyFile: "pipeline/strategy.md",
};
