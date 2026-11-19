// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../src/App.tsx";
import { fixtureDataset } from "./fixtures/dataset.ts";

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const rows = () => within(screen.getByRole("list", { name: "Ranked feature requests" })).getAllByRole("listitem");
const problems = () => rows().map((r) => within(r).getByTestId("problem").textContent);

describe("App", () => {
  it("says what it is and links the data source", () => {
    render(<App dataset={fixtureDataset()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/feature-request scoring/i);
    const source = screen.getByRole("link", { name: /github\.com\/cloudinary$/ });
    expect(source).toHaveAttribute("href", "https://github.com/cloudinary");
    // The data source sits in the intro sentence, so it shows the same way on both tabs.
    expect(source.closest("p")).toHaveTextContent("This demo uses Cloudinary's public repos (github.com/cloudinary).");
    expect(screen.queryByText(/Data source:/)).toBeNull();
  });

  it("shows the counts and the last-updated date", () => {
    render(<App dataset={fixtureDataset()} />);
    const counts = screen.getByLabelText("Counts");
    expect(counts).toHaveTextContent("215");
    expect(counts).toHaveTextContent("62");
    expect(counts).toHaveTextContent("16");
    expect(screen.getByText(/Last updated 19 Nov 2026/)).toBeInTheDocument();
  });

  it("ranks rows and re-ranks when a weight changes", () => {
    render(<App dataset={fixtureDataset()} />);
    expect(problems()).toEqual(["Reachy problem", "Impacty problem", "Vague problem"]);
    fireEvent.change(screen.getByLabelText("Business Impact weight"), { target: { value: "10" } });
    expect(problems()[0]).toBe("Impacty problem");
  });

  it("filters to requests that need review", () => {
    render(<App dataset={fixtureDataset()} />);
    fireEvent.click(screen.getByLabelText("Low-confidence scores"));
    expect(problems()).toEqual(["Vague problem"]);
  });

  it("expands a row to show every reason and links the issue", () => {
    render(<App dataset={fixtureDataset()} />);
    const last = rows()[2];
    expect(within(last).queryByText("too thin to judge")).toBeNull();
    fireEvent.click(within(last).getByRole("button"));
    expect(within(last).getByText("too thin to judge")).toBeInTheDocument();
    expect(within(last).getByText("feasibility reason")).toBeInTheDocument();
    const link = within(rows()[0]).getByRole("link", { name: "cloudinary_npm#11" });
    expect(link).toHaveAttribute("href", "https://github.com/cloudinary/cloudinary_npm/issues/11");
  });

  it("carries the limits and the pricing extension on the How it works tab", () => {
    render(<App dataset={fixtureDataset()} />);
    goTo("#how-it-works");
    const about = screen.getByRole("region", { name: "About this demo" });
    expect(about).toHaveTextContent(/public GitHub issues/i);
    expect(about).toHaveTextContent(/educated guesses/i);
    expect(about).toHaveTextContent(/pricing/i);
  });

  it("links back to the portfolio and to the source code", () => {
    render(<App dataset={fixtureDataset()} />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: /petercimring\.space/ })).toHaveAttribute("href", "https://petercimring.space");
    expect(within(footer).getByRole("link", { name: /source/i })).toHaveAttribute("href", "https://github.com/pcimring/feature-request-scoring");
  });

  it("shows an empty state when there are no requests", () => {
    render(<App dataset={{ ...fixtureDataset(), requests: [] }} />);
    expect(screen.getByText(/No feature requests to show/)).toBeInTheDocument();
  });
});

describe("weight sliders", () => {
  it("start in the middle of a 0 to 10 range", () => {
    render(<App dataset={fixtureDataset()} />);
    const slider = screen.getByLabelText("Reach weight");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "10");
    expect(slider).toHaveValue("5");
  });
});

describe("sort by", () => {
  it("defaults to the overall score", () => {
    render(<App dataset={fixtureDataset()} />);
    expect(screen.getByLabelText("Sort by")).toHaveValue("weighted");
    expect(screen.getByRole("option", { name: "Overall score" })).toBeInTheDocument();
  });

  it("sorts by a single dimension, highest first", () => {
    render(<App dataset={fixtureDataset()} />);
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "impact" } });
    expect(problems()[0]).toBe("Impacty problem");
    expect(rows()[0].querySelector(".rank")).toHaveTextContent("1");
  });

  it("sorts by confidence, lowest first", () => {
    render(<App dataset={fixtureDataset()} />);
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "confidence" } });
    expect(problems()[0]).toBe("Vague problem");
  });
});

describe("row info line", () => {
  it("labels repo stars as the SDK's, apart from the request's reactions and comments", () => {
    const data = fixtureDataset();
    data.requests = data.requests.map((r) => ({ ...r, repoStars: 673 }));
    render(<App dataset={data} />);
    expect(within(rows()[0]).getByText("SDK: 673 stars")).toBeInTheDocument();
  });
});

describe("people count", () => {
  it("shows how many people the comments come from", () => {
    const data = fixtureDataset();
    data.requests = data.requests.map((r) => ({ ...r, comments: 32, people: 21 }));
    render(<App dataset={data} />);
    expect(within(rows()[0]).getByText("32 comments from 21 people")).toBeInTheDocument();
  });
});

describe("people count wording", () => {
  it("drops the people count when there are no comments and says 'person' for one", () => {
    const data = fixtureDataset();
    data.requests = [
      { ...data.requests[0], comments: 0, people: 1, reactions: 9 },
      { ...data.requests[1], comments: 3, people: 1, reactions: 1 },
    ];
    render(<App dataset={data} />);
    const row = (problem: string) => rows().find((r) => within(r).getByTestId("problem").textContent === problem)!;
    expect(within(row(data.requests[0].problem)).getByText("0 comments")).toBeInTheDocument();
    expect(within(row(data.requests[1].problem)).getByText("3 comments from 1 person")).toBeInTheDocument();
  });
});

describe("backlog hygiene", () => {
  function flaggedData() {
    const data = fixtureDataset();
    data.counts = { ...data.counts, flagged: 1 };
    data.requests = data.requests.map((r) =>
      r.problem === "Impacty problem"
        ? { ...r, updatedAt: "2021-01-12T00:00:00Z", flags: [{ type: "possibly_resolved" as const, reason: "SDK now exists" }] }
        : r,
    );
    return data;
  }

  it("shows a flag badge and the flag reason when expanded", () => {
    render(<App dataset={flaggedData()} />);
    const row = rows().find((r) => within(r).getByTestId("problem").textContent === "Impacty problem")!;
    expect(within(row).getByText("Possibly resolved")).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button"));
    expect(within(row).getByText("SDK now exists")).toBeInTheDocument();
  });

  it("shows the last activity date on each row", () => {
    render(<App dataset={flaggedData()} />);
    const row = rows().find((r) => within(r).getByTestId("problem").textContent === "Impacty problem")!;
    expect(within(row).getByText("Last activity Jan 2021")).toBeInTheDocument();
  });

  it("filters to candidates to close or split, and counts them", () => {
    render(<App dataset={flaggedData()} />);
    expect(screen.getByLabelText("Counts")).toHaveTextContent("flagged");
    fireEvent.click(screen.getByLabelText("Possibly resolved"));
    expect(problems()).toEqual(["Impacty problem"]);
  });
});

describe("PR waiting flag", () => {
  it("has its own badge label", () => {
    const data = fixtureDataset();
    data.requests = data.requests.map((r, i) => (i === 0 ? { ...r, flags: [{ type: "pr_waiting" as const, reason: "PR #60" }] } : r));
    render(<App dataset={data} />);
    expect(within(screen.getByRole("list", { name: "Ranked feature requests" })).getByText("PR waiting")).toBeInTheDocument();
  });
});

describe("filters and confidence placement", () => {
  it("shows confidence as one color-coded word under the score, apart from the flag badges", () => {
    render(<App dataset={fixtureDataset()} />);
    const row = rows().find((r) => within(r).getByTestId("problem").textContent === "Vague problem")!;
    const conf = row.querySelector(".score-col .confidence");
    expect(conf).toHaveTextContent(/^low$/);
    expect(conf).toHaveClass("low");
    expect(row.querySelector(".badges")?.textContent ?? "").not.toMatch(/confidence|review/i);
  });
});

describe("show only", () => {
  function data() {
    const d = fixtureDataset();
    d.requests = d.requests.map((r) =>
      r.problem === "Impacty problem" ? { ...r, flags: [{ type: "pr_waiting" as const, reason: "PR #1" }] } : r,
    );
    return d;
  }

  it("has a 'Show only' group with one box per filter", () => {
    render(<App dataset={data()} />);
    const group = screen.getByRole("group", { name: /Show only/ });
    for (const name of ["Low-confidence scores", "Possibly resolved", "Mixed requests", "PR waiting"]) {
      expect(within(group).getByLabelText(name)).toBeInTheDocument();
    }
  });

  it("shows everything when nothing is ticked, with a showing count", () => {
    render(<App dataset={data()} />);
    expect(problems()).toHaveLength(3);
    expect(screen.getByText("Showing 3 of 3")).toBeInTheDocument();
  });

  it("combines ticked boxes with OR", () => {
    render(<App dataset={data()} />);
    fireEvent.click(screen.getByLabelText("Low-confidence scores"));
    expect(problems()).toEqual(["Vague problem"]);
    fireEvent.click(screen.getByLabelText("PR waiting"));
    expect(problems().sort()).toEqual(["Impacty problem", "Vague problem"]);
    expect(screen.getByText("Showing 2 of 3")).toBeInTheDocument();
  });

  it("labels the count card as low-confidence scores", () => {
    render(<App dataset={data()} />);
    expect(screen.getByLabelText("Counts")).toHaveTextContent("low-confidence scores");
  });
});

describe("numbering under a filter", () => {
  it("numbers the visible rows 1, 2, 3 whatever the filter and sort", () => {
    const d = fixtureDataset();
    d.requests = d.requests.map((r) =>
      r.problem === "Reachy problem" ? r : { ...r, flags: [{ type: "mixed_requests" as const, reason: "drifted" }] },
    );
    render(<App dataset={d} />);
    fireEvent.click(screen.getByLabelText("Mixed requests"));
    const ranks = () => rows().map((r) => r.querySelector(".rank")?.textContent);
    expect(ranks()).toEqual(["1", "2"]);
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "confidence" } });
    expect(ranks()).toEqual(["1", "2"]);
  });
});

describe("flag tooltips", () => {
  it("explains each flag badge on hover", () => {
    const d = fixtureDataset();
    d.requests = d.requests.map((r, i) => (i === 0 ? { ...r, flags: [{ type: "pr_waiting" as const, reason: "PR #60" }] } : r));
    render(<App dataset={d} />);
    const badge = within(screen.getByRole("list", { name: "Ranked feature requests" })).getByText("PR waiting");
    expect(badge).toHaveAttribute("title", expect.stringMatching(/pull request/i));
  });
});

describe("page navigation", () => {
  const nav = () => screen.getByRole("navigation", { name: "Page" });

  it("has a nav bar above the main heading with Scores and How it works tabs", () => {
    render(<App dataset={fixtureDataset()} />);
    expect(within(nav()).getByRole("link", { name: "Scores" })).toHaveAttribute("href", "#scores");
    expect(within(nav()).getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#how-it-works");
    const heading = screen.getByRole("heading", { level: 1 });
    expect(nav().compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("opens on the Scores tab: the list shows and the overview does not", () => {
    render(<App dataset={fixtureDataset()} />);
    expect(within(nav()).getByRole("link", { name: "Scores" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("list", { name: "Ranked feature requests" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "About this demo" })).toBeNull();
  });

  it("switches to How it works and back with the hash, so the browser back button works", () => {
    render(<App dataset={fixtureDataset()} />);
    goTo("#how-it-works");
    expect(within(nav()).getByRole("link", { name: "How it works" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("region", { name: "About this demo" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Ranked feature requests" })).toBeNull();
    goTo("#scores");
    expect(screen.getByRole("list", { name: "Ranked feature requests" })).toBeInTheDocument();
  });

  it("opens straight on How it works from a direct link", () => {
    window.location.hash = "#how-it-works";
    render(<App dataset={fixtureDataset()} />);
    expect(screen.getByRole("region", { name: "About this demo" })).toBeInTheDocument();
  });

  it("keeps the title and intro on both tabs, and the overview pointer only on Scores", () => {
    render(<App dataset={fixtureDataset()} />);
    const pointer = screen.getByText(/For a more detailed overview/);
    expect(pointer).toHaveTextContent("For a more detailed overview, see How it works.");
    expect(within(pointer).getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#how-it-works");
    goTo("#how-it-works");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Product teams get more feature requests/)).toBeInTheDocument();
    expect(screen.queryByText(/For a more detailed overview/)).toBeNull();
  });

  it("stays on How it works when Back to top is clicked", () => {
    render(<App dataset={fixtureDataset()} />);
    goTo("#how-it-works");
    // The browser would follow href="#top" and change the hash; the click must scroll instead.
    const followed = fireEvent.click(screen.getByRole("link", { name: /back to top/i }));
    expect(followed).toBe(false);
    // Any other hash (such as #top) leaves the current tab alone.
    goTo("#top");
    expect(screen.getByRole("region", { name: "About this demo" })).toBeInTheDocument();
  });

  it("links from the bottom back to the top", () => {
    render(<App dataset={fixtureDataset()} />);
    expect(screen.getByRole("link", { name: /back to top/i })).toHaveAttribute("href", "#top");
    expect(document.getElementById("top")).not.toBeNull();
  });
});
