"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { money } from "@/lib/vehicle";
const plans = [
  {
    title: "Basic Rental",
    subtitle: "For the basics",
    cents: 4900,
    positive: 4,
    category: "Sedan",
  },
  {
    title: "Recommended",
    subtitle: "For the explorers",
    cents: 9500,
    positive: 5,
    category: "SUV",
  },
  {
    title: "Pro",
    subtitle: "For the open road",
    cents: 15400,
    positive: 6,
    category: "Sports",
  },
];
const features = [
  "50% down payment",
  "Insurance options",
  "Doorstep delivery",
  "Safe & sanitized",
  "Flexible rental plans",
  "Refundable deposit options",
  "Extensions subject to availability",
];
export function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <>
      <div className="pricing-period">
        <span>Monthly</span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          aria-label="Yearly pricing"
          onClick={() => setYearly(!yearly)}
        >
          <span />
        </button>
        <span>Yearly</span>
      </div>
      <div className="pricing-grid">
        <div className="pricing-intro">
          <h3>
            Save more with
            <br />
            Good Plans
          </h3>
          <p>
            Find a plan that fits your journey, from everyday trips to longer
            escapes.
          </p>
          <Link href="/cars" aria-label="Explore cars for rental plans">
            <ArrowRight size={21} />
          </Link>
          <Image
            src="/images/home/pricing-car.webp"
            alt="White sports sedan"
            width={260}
            height={300}
          />
        </div>
        {plans.map((plan, index) => (
          <article
            className={`pricing-card ${index === 1 ? "pricing-featured" : ""}`}
            key={plan.title}
          >
            <div className="plan-heading">
              <h3>{plan.title}</h3>
              <p>{plan.subtitle}</p>
            </div>
            <p className="plan-price">
              {money(plan.cents * (yearly ? 10 : 1))}
            </p>
            <p className="plan-term">
              Example package / {yearly ? "year" : "month"}
            </p>
            <ul>
              {features.map((feature, i) => (
                <li key={feature}>
                  {i < plan.positive ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <XCircle size={14} className="excluded" />
                  )}
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={`/cars?category=${plan.category}`}
              className={`button ${index === 1 ? "button-primary" : "button-outline"}`}
            >
              Explore Cars
            </Link>
          </article>
        ))}
      </div>
      <p className="demo-caption">
        Illustrative package pricing · Packages cannot be purchased in this
        preview
      </p>
    </>
  );
}
