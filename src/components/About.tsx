export function About({ company }: { company: string }) {
  return (
    <section className="about" aria-labelledby="about-title">
      <h2 id="about-title">About this demo</h2>
      <h3 id="how-it-works">How it works</h3>
      <p>
        A script pulls every open issue from a GitHub organization's public repos; this demo uses {company}'s. Claude
        Haiku sorts them into feature requests, bugs, questions and other.
      </p>
      <p>
        It then restates each feature request as the underlying problem, separate from the solution the requester
        proposed, scores it on five dimensions with a reason for each, and says how confident it is. A final pass looks at
        all the requests side by side and adjusts Reach, Business Impact and Urgency relative to each other.
      </p>
      <p>
        It also reads the latest comments and flags threads that drifted into several requests, requests that may already
        be solved (possibly resolved), and requests with a pull request waiting, so a product manager can clear out dead
        weight instead of ranking it.
      </p>
      <p>
        The results are saved to a file. This page only does the arithmetic for the weights, so no AI runs while you
        browse.
      </p>
      <p>
        Strategic Fit is scored against a short summary of {company}'s public announcements. Pointing the tool at another
        organization takes a new summary and one run.
      </p>
      <h3>Limits</h3>
      <p>
        These are public GitHub issues, not {company}'s full product wishlist; a real deployment would also pull from
        tools like Productboard, Jira and Gong. Business Impact and Urgency are educated guesses from public text, and the
        tool has no access to {company}'s internal data. That is why every score shows its reason and thin requests are
        flagged for a product manager to review. The AI sorts; a person decides.
      </p>
      <h3>Pricing extension</h3>
      <p>
        With billing data, Reach and Business Impact could be weighted by plan tier and revenue, normalized by account
        size. The ranking then becomes a pricing signal: which requests come from accounts close to an upgrade, and which
        features could justify a higher tier.
      </p>
    </section>
  );
}
