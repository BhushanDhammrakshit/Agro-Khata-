"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ForceLightTheme } from "@/components/ForceLightTheme";
import { landingFont } from "@/lib/landing-font";
import { api, ApiError } from "@/lib/api";

type MessageType = "contact" | "feedback";

export function ContactForm() {
  const searchParams = useSearchParams();
  const initialType: MessageType = searchParams.get("type") === "feedback" ? "feedback" : "contact";

  const [type, setType] = useState<MessageType>(initialType);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.sendContactMessage({ name, email, type, message });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-emerald-50 via-white to-white">
      <ForceLightTheme />
      <header className="w-full p-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to home
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 p-6 pt-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <Image src="/VajaBaki.png" alt="VajaBaki logo" fill className="object-contain p-1" />
          </div>
          <span className={`${landingFont.className} text-xl font-extrabold tracking-tight text-slate-900`}>VajaBaki</span>
        </Link>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-slate-900">Message sent</h1>
              <p className="text-sm text-slate-600">Thanks for reaching out — our team will get back to you soon.</p>
              <Link href="/" className="mt-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">Back to home</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-slate-900">{type === "feedback" ? "Share your feedback" : "Contact us"}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {type === "feedback"
                  ? "Tell us what you like or what we can improve."
                  : "Have a question or need help? Send us a message."}
              </p>

              <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setType("contact")}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${type === "contact" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
                >
                  Contact
                </button>
                <button
                  type="button"
                  onClick={() => setType("feedback")}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${type === "feedback" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
                >
                  Feedback
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Your name</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Your email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
                  <textarea
                    required
                    rows={5}
                    maxLength={4000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send message"}
                </button>
              </form>
            </>
          )}
        </div>

        <Link href="/" className="text-sm text-slate-500 underline hover:text-slate-700">Back to home</Link>
      </main>
    </div>
  );
}
