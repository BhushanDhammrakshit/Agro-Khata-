import Image from "next/image";
import Link from "next/link";
import { en } from "@/lib/i18n/dictionaries/en";
import { ForceLightTheme } from "@/components/ForceLightTheme";
import { landingFont } from "@/lib/landing-font";
import { FeatureIcon } from "./landing-icons";

const SITE_URL = "https://www.vajabaki.com";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "VajaBaki",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: en.landing.subheading,
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
};

export default function Home() {
  const { landing } = en;
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <ForceLightTheme />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Decorative gradient blobs, behind all content */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-72 -right-32 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-100/60 blur-3xl" />
      </div>

      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <Image src="/VajaBaki.png" alt="VajaBaki logo" fill className="object-contain p-1" />
            </div>
            <span className={`${landingFont.className} text-xl font-extrabold tracking-tight text-slate-900`}>{landing.title}</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/contact?type=contact" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:inline-block">{landing.contactUs}</Link>
            <Link href="/contact?type=feedback" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:inline-block">{landing.feedback}</Link>
            <Link href="/login" className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">{landing.login}</Link>
            <Link href="/register" className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700">{landing.register}</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-24 px-6 pt-20 pb-24 text-center">
        <div className="grid w-full items-center gap-12 text-center lg:grid-cols-2 lg:text-left">
          <div className="flex flex-col items-center gap-6 lg:items-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-700">
              {landing.badge}
            </span>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {landing.heading}
            </h1>
            <p className="max-w-xl text-base text-slate-600 sm:text-lg">{landing.subheading}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/register"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-emerald-600/30"
              >
                {landing.register}
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
              >
                {landing.login}
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <Image
              src="/hero-illustration.svg"
              alt="Preview of the VajaBaki invoicing and party ledger dashboard"
              width={560}
              height={440}
              priority
              className="w-full drop-shadow-xl"
            />
          </div>
        </div>

        <section aria-labelledby="features-heading" className="w-full">
          <h2 id="features-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">{landing.featuresHeading}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{landing.featuresSubheading}</p>
          <div className="mt-10 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-3">
            {landing.features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-600/10"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <FeatureIcon icon={feature.icon} />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid w-full max-w-4xl items-center gap-8 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-12 text-left text-white shadow-xl shadow-emerald-600/20 sm:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{landing.ctaHeading}</h2>
            <p className="mt-2 max-w-md text-sm text-emerald-50 sm:text-base">{landing.ctaSubheading}</p>
            <Link
              href="/register"
              className="mt-6 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              {landing.register}
            </Link>
          </div>
          <Image
            src="/cta-illustration.svg"
            alt="VajaBaki mobile app preview"
            width={220}
            height={280}
            className="mx-auto hidden w-40 sm:block"
          />
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="relative h-7 w-7 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
            <Image src="/VajaBaki.png" alt="VajaBaki logo" fill className="object-contain p-0.5" />
          </div>
          <span className={`${landingFont.className} text-base font-extrabold tracking-tight text-slate-900`}>{landing.title}</span>
        </Link>
        <p className="mt-3">{landing.footerTagline}</p>
        <p className="mt-2">
          &copy; {new Date().getFullYear()} VajaBaki ·{" "}
          <Link href="/login" className="underline hover:text-slate-700">{landing.login}</Link> ·{" "}
          <Link href="/register" className="underline hover:text-slate-700">{landing.register}</Link> ·{" "}
          <Link href="/contact?type=contact" className="underline hover:text-slate-700">{landing.contactUs}</Link> ·{" "}
          <Link href="/contact?type=feedback" className="underline hover:text-slate-700">{landing.feedback}</Link>
        </p>
      </footer>
    </div>
  );
}


