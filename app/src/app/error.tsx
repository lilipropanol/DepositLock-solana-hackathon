"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <div className="eyebrow">DEPOSITLOCK</div>
      <h1>Let’s get you back home.</h1>
      <p>The dashboard couldn’t load. Your saved demo can be restored when you retry.</p>
      <button className="button button-primary" onClick={reset}>Try again</button>
    </main>
  );
}
