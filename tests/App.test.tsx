// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../src/App.tsx";
import { fixtureDataset } from "./fixtures/dataset.ts";

afterEach(cleanup);

const rows = () => within(screen.getByRole("list", { name: "Ranked feature requests" })).getAllByRole("listitem");
const problems = () => rows().map((r) => within(r).getByTestId("problem").textContent);

describe("App", () => {
  it("says what it is and links the data source", () => {
    render(<App dataset={fixtureDataset()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/feature-request scoring/i);
    expect(screen.getByRole("link", { name: /github\.com\/cloudinary$/ })).toHaveAttribute("href", "https://github.com/cloudinary");
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
    fireEvent.click(screen.getByLabelText(/Only show requests that need review/));
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

  it("carries the limits and the pricing extension on the page", () => {
    render(<App dataset={fixtureDataset()} />);
    const about = screen.getByRole("region", { name: "About this demo" });
    expect(about).toHaveTextContent(/public SDK requests/i);
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
  it("defaults to the weighted score", () => {
    render(<App dataset={fixtureDataset()} />);
    expect(screen.getByLabelText("Sort by")).toHaveValue("weighted");
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
