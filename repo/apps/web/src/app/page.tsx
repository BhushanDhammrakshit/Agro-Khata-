import Image from "next/image";
import Link from "next/link";
import { landingFont } from "@/lib/landing-font";
import "./landing.css";

const SITE_URL = "https://www.vajabaki.com";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "VajaBaki",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "GST invoicing and party ledger software for mandi traders, agro vendors and small businesses.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
};

export default function Home() {
  return (
    <div className="landing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="landing-header">
        <div className="landing-container header-inner">
          <Link href="/" className="brand" aria-label="VajaBaki home">
            <div className="brand-mark"><Image src="/VajaBaki.png" alt="" fill sizes="42px" /></div>
            <span className={`${landingFont.className} brand-name`}>VajaBaki</span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="#features">Features</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="/contact?type=contact">Support</Link>
          </nav>
          <div className="header-actions">
            <Link href="/login" className="login-link">Log in</Link>
            <Link href="/register" className="button button-small">Start billing free</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <p className="market-label"><span className="market-dot" />Built for mandis & agro businesses</p>
              <h1>Make GST bills quickly. Know who still owes you.</h1>
              <p className="hero-lead">
                Keep the day&apos;s sales, party balances, GST records and cash
                entries together — so the counter moves fast and nothing is forgotten.
              </p>
              <div className="hero-actions">
                <Link href="/register" className="button button-primary">Create your first bill <span aria-hidden="true">→</span></Link>
                <Link href="#how-it-works" className="text-link">See how it works</Link>
              </div>
              <div className="trust-row">
                <span><strong>GST</strong> ready bills</span>
                <span><strong>Mobile</strong> friendly</span>
                <span><strong>No</strong> credit card</span>
              </div>
            </div>

            <div className="ledger-stage" aria-label="Sample GST invoice and party balance">
              <div className="weight-slip">WEIGHT 1,240 kg <span>Lot 27</span></div>
              <article className="invoice-sheet">
                <div className="invoice-top">
                  <div>
                    <p className="invoice-kicker">TAX INVOICE</p>
                    <h2>Shree Agro Traders</h2>
                    <p>APMC Yard · Nashik</p>
                  </div>
                  <div className="gst-seal"><span>GST</span>27AAACS1234A1Z8</div>
                </div>
                <div className="invoice-meta">
                  <div><span>Bill no.</span><strong>VB-01842</strong></div>
                  <div><span>Party</span><strong>Patil Mandi Depot</strong></div>
                  <div><span>Date</span><strong>23 Nov 2026</strong></div>
                </div>
                <table className="invoice-table">
                  <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                  <tbody>
                    <tr><td>Onion · Nashik</td><td>1,240 kg</td><td>₹28</td><td>₹34,720</td></tr>
                    <tr><td>Labour</td><td>—</td><td>—</td><td>₹450</td></tr>
                  </tbody>
                </table>
                <div className="invoice-total">
                  <div><span>CGST 2.5%</span><strong>₹879</strong></div>
                  <div><span>SGST 2.5%</span><strong>₹879</strong></div>
                  <div className="grand-total"><span>Bill total</span><strong>₹36,928</strong></div>
                </div>
                <div className="invoice-status">GST READY</div>
              </article>

              <aside className="balance-card">
                <div className="balance-head">
                  <span>Patil Mandi Depot</span>
                  <span className="balance-state">Pending</span>
                </div>
                <p>Still to receive</p>
                <strong>₹12,450</strong>
                <div className="balance-track"><span /></div>
                <div className="balance-foot"><span>₹24,478 received</span><span>Due 30 Nov</span></div>
              </aside>
            </div>
          </div>
        </section>

        <section className="core-section" id="features">
          <div className="landing-container">
            <div className="section-heading">
              <p>Day-to-day work, in the right order</p>
              <h2>Bill the sale. Remember the balance.</h2>
            </div>
            <div className="core-grid">
              <article className="core-card invoice-card">
                <div className="card-label">1 · Sell goods</div>
                <h3>GST bills without the paperwork chase</h3>
                <p>Create sales and purchase bills with the right tax, party and item details — in a few taps.</p>
                <div className="mini-bill">
                  <div className="mini-bill-top"><span>INVOICE</span><strong>VB-01842</strong></div>
                  <div className="mini-row"><span>Potato · 800 kg</span><strong>₹21,600</strong></div>
                  <div className="mini-row"><span>GST</span><strong>₹1,080</strong></div>
                  <div className="mini-row mini-total"><span>Total</span><strong>₹22,680</strong></div>
                </div>
              </article>

              <article className="core-card ledger-card">
                <div className="card-label">2 · Collect payment</div>
                <h3>See who still owes you money</h3>
                <p>Open one party&apos;s page and see every unpaid bill, payment received and due date.</p>
                <div className="party-list">
                  <div className="party-row"><div className="party-avatar">PM</div><div><strong>Patil Mandi Depot</strong><span>3 unpaid bills</span></div><b>₹12,450</b></div>
                  <div className="party-row"><div className="party-avatar green">KS</div><div><strong>Kisan Supply Co.</strong><span>Settled yesterday</span></div><b className="settled">₹0</b></div>
                </div>
              </article>
            </div>

            <div className="secondary-strip" aria-label="Additional features">
              <article><div className="secondary-icon">T</div><div><h3>Keep every vehicle record</h3><p>Drivers, registration details and invoice-linked trips.</p></div></article>
              <article><div className="secondary-icon">||</div><div><h3>Run more than one company</h3><p>Separate firms and branch records under one login.</p></div></article>
              <article><div className="secondary-icon">↗</div><div><h3>Know the month&apos;s numbers</h3><p>Sales, purchases and pending amounts in clear reports.</p></div></article>
            </div>
          </div>
        </section>

        <section className="workflow" id="how-it-works">
          <div className="landing-container">
            <div className="workflow-title">
              <p>One simple routine</p>
              <h2>From weighing to collection</h2>
            </div>
            <div className="workflow-grid">
              <article><span className="step-number">01</span><h3>Add the party</h3><p>Name, GST number and phone — saved once for every future bill.</p></article>
              <article><span className="step-number">02</span><h3>Make the bill</h3><p>Choose goods, quantity and tax. Print or share it before the goods move.</p></article>
              <article><span className="step-number">03</span><h3>Record the payment</h3><p>Enter cash or bank received and see the balance update immediately.</p></article>
            </div>
          </div>
        </section>

        <section className="closing-cta">
          <div className="landing-container cta-inner">
            <div>
              <p>Ready for the next business day</p>
              <h2>Start with one bill. Leave the register open.</h2>
            </div>
            <Link href="/register" className="button button-primary">Register your company <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <Link href="/" className="brand" aria-label="VajaBaki home">
            <div className="brand-mark"><Image src="/VajaBaki.png" alt="" fill sizes="36px" /></div>
            <span className={`${landingFont.className} brand-name`}>VajaBaki</span>
          </Link>
          <p>Billing and ledger software for agro traders, mandis and vendors.</p>
          <div className="footer-links">
            <Link href="/login">Log in</Link>
            <Link href="/contact?type=contact">Contact</Link>
            <Link href="/contact?type=feedback">Feedback</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}


