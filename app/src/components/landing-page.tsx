import Link from "next/link";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { RotatingWord } from "@/components/rotating-word";

const steps = [
  {
    number: "01",
    title: "Agree the terms",
    description: "Tenant and landlord set the deposit amount and the date the tenancy ends.",
  },
  {
    number: "02",
    title: "Hold the deposit",
    description: "The deposit stays in an account governed by those agreed release rules.",
  },
  {
    number: "03",
    title: "Return it on time",
    description: "At the end of the tenancy, a short review period gives both sides a clear next step.",
  },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <section className="hero-stage" aria-label="DepositLock introduction">
        <div className="hero-section" aria-labelledby="hero-title">
          <div className="hero-background" role="img" aria-label="Dublin townhouse at dusk with warm light in the windows" />
          <header className="landing-header">
            <Link className="brand" href="/" aria-label="DepositLock home">
              <span className="brand-mark" aria-hidden="true"><span /></span>
              <span>Deposit<span className="brand-light">Lock</span></span>
            </Link>
            <nav className="landing-nav" aria-label="Main navigation">
              <a className="nav-home" href="#top">Home</a>
              <a href="#our-idea">Our idea</a>
              <a href="#how-it-works">How it works</a>
            </nav>
            <span className="hero-audience">For tenants &amp; landlords</span>
            <a className="hero-mobile-nav" href="#how-it-works">How it works <ArrowDown size={13} aria-hidden="true" /></a>
          </header>

          <div className="hero-body" id="top">
            <div className="hero-copy">
              <p className="eyebrow"><span className="eyebrow-mark" /> BROWSER DEMO · NO REAL FUNDS</p>
              <h1 id="hero-title">
                <span className="visually-hidden">Rental deposits have never felt this easy.</span>
                <span className="hero-title-visual" aria-hidden="true">
                  <span>Rental deposits</span>
                  <span>have never felt this</span>
                  <span className="hero-title-last"><RotatingWord /></span>
                </span>
              </h1>
              <p className="hero-description">Set the terms together. Keep the deposit held until the agreed return date.</p>
            </div>

            <div className="hero-highlights" aria-label="DepositLock principles">
              <span>Agreed terms upfront</span>
              <span>No unilateral access</span>
              <span>A clear review deadline</span>
            </div>

            <div className="hero-bottom">
              <div className="hero-fact hero-property-fact">
                <span>EXAMPLE HOME</span>
                <strong>Grand Canal Dock</strong>
                <small>Modern 2-bed · Dublin 2</small>
              </div>
              <div className="hero-fact">
                <span>MONTHLY RENT</span>
                <strong>€2,200 <small>/ month</small></strong>
              </div>
              <div className="hero-fact">
                <span>DEMO DEPOSIT</span>
                <strong>1 SOL <small>test funds</small></strong>
              </div>
              <Link className="button button-hero-primary" href="/demo">View the deposit demo <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-content">
        <section className="explainer-section" id="how-it-works" aria-labelledby="how-title">
          <div className="explainer-heading">
            <p className="eyebrow">A SIMPLE IDEA</p>
            <h2 id="how-title">One deposit.<br /><span>One clear timeline.</span></h2>
            <p>Instead of one person holding the money in a personal account, DepositLock is designed around shared rules and a visible timeline.</p>
          </div>
          <ol className="steps-grid">
            {steps.map((step) => (
              <li key={step.number}>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="closing-section" id="our-idea" aria-labelledby="closing-title">
          <div className="closing-icon"><Check size={23} aria-hidden="true" /></div>
          <div className="closing-copy">
            <p className="eyebrow">A CLEARER START FOR BOTH SIDES</p>
            <h2 id="closing-title">The deposit stays part of the conversation.</h2>
            <p>Renters can see the return deadline. Landlords have a defined review period. The rules are visible to everyone involved.</p>
          </div>
          <Link className="button button-dark" href="/demo">See the 10-second demo <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>

        <footer className="landing-footer">
          <Link className="brand footer-brand" href="/" aria-label="DepositLock home">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span>Deposit<span className="brand-light">Lock</span></span>
          </Link>
          <span>Hackathon prototype · No real funds or wallet connection</span>
          <Link href="/demo">Open interactive demo <ArrowRight size={14} aria-hidden="true" /></Link>
        </footer>
      </div>
    </main>
  );
}
