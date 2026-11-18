export function About({ company }: { company: string }) {
  return (
    <section className="about" aria-labelledby="about-title">
      <h2 id="about-title">About this demo</h2>
      <h3 id="how-it-works">How it works</h3>
      <p>
        A script pulls every open issue from a GitHub org's public repos; this demo uses {company}. An AI model (Claude
        Haiku in this demo) sorts them into feature requests, bugs, questions and other.
      </p>
      <p>
        Next, the model rewrites each feature request as the problem behind it, so it is judged on the need rather than on
        the fix the requester suggested. It then scores the request from 1 to 5 on five dimensions, each with a one-line
        reason you can check against the issue:
      </p>
      <ul className="rubric">
        <li>
          <strong>Reach:</strong> how many people want it. Mostly the number of distinct people in the thread, then
          comments and reactions; the repo's star count only breaks ties.
        </li>
        <li>
          <strong>Business Impact:</strong> likely effect on revenue, retention or expansion, judged from what the issue
          says, such as production use or a paying team.
        </li>
        <li>
          <strong>Urgency:</strong> whether something is blocked now or has a deadline.
        </li>
        <li>
          <strong>Strategic Fit:</strong> how well it matches {company}'s stated direction, from a short summary of its
          public announcements.
        </li>
        <li>
          <strong>Feasibility:</strong> how easy it is to build; 5 is a small change in one repo.
        </li>
      </ul>
      <p>
        The model also says how confident it is in each request's scores, so you know which ones to check first. Because each
        request is scored on its own, scores tend to bunch in the middle; a final pass compares all the requests side by
        side and spreads out Reach, Business Impact and Urgency so the ranking can tell them apart.
      </p>
      <p>
        The model also reads the latest comments in each thread and flags requests that may not need ranking at all:
      </p>
      <ul className="rubric">
        <li>
          <strong>Mixed requests:</strong> the thread drifted into several separate asks, so it may need splitting.
        </li>
        <li>
          <strong>Possibly resolved:</strong> a maintainer says it shipped, a dedicated repo now exists, or the requester
          accepted a working alternative, so it may be ready to close.
        </li>
        <li>
          <strong>PR waiting:</strong> someone has already opened a pull request, so reviewing it may be cheaper than
          building from scratch.
        </li>
      </ul>
      <p>This way a product manager can clear out dead weight instead of ranking it.</p>
      <p>
        The results are saved to a file. This page only does the arithmetic for the weights, so no AI runs while you
        browse.
      </p>
      <p>Pointing the tool at another organization takes a new strategy summary and one run.</p>
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
