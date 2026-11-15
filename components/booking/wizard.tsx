"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  periodSchema,
  driverSchema,
  type PeriodInput,
  type DriverInput,
} from "@/lib/rental/validation";
import type { BookingOptions, BookingView } from "@/lib/server/bookings";
import type { RentalPrice } from "@/lib/rental/pricing";
import { money } from "@/lib/vehicle";
async function request(url: string, data: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Unable to save booking.");
  return body;
}
export function PriceSummary({ price }: { price: RentalPrice | null }) {
  if (!price)
    return <p>Choose your rental details for a server-calculated quote.</p>;
  return (
    <dl className="booking-prices">
      {[
        [
          `Rental · ${price.days} day${price.days === 1 ? "" : "s"}`,
          price.baseCents,
        ],
        ["Extra services", price.extrasCents],
        ["Insurance", price.insuranceCents],
        ["Delivery", price.deliveryCents],
        ["Discount", -price.discountCents],
        [`Tax (${price.taxRateBps / 100}%)`, price.taxCents],
        ["Refundable deposit", price.depositCents],
        ["Estimated total", price.totalCents],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{money(value as number)}</dd>
        </div>
      ))}
    </dl>
  );
}
function PeriodForm({
  options,
  booking,
  onSave,
  busy,
}: {
  options: BookingOptions;
  booking: BookingView | null;
  onSave: (v: PeriodInput) => Promise<void>;
  busy: boolean;
}) {
  const form = useForm<PeriodInput>({
    resolver: zodResolver(periodSchema),
    defaultValues: {
      delivery: booking?.delivery ?? true,
      pickupLocationId: booking?.pickupLocationId ?? options.vehicle.locationId,
      returnLocationId: booking?.returnLocationId ?? options.vehicle.locationId,
      pickupLocal: booking?.pickupLocal ?? "",
      returnLocal: booking?.returnLocal ?? "",
    },
  });
  const delivery = useWatch({ control: form.control, name: "delivery" });
  const [same, setSame] = useState(false);
  return (
    <form onSubmit={form.handleSubmit(onSave)} noValidate>
      <h2>Rental Type</h2>
      <div className="booking-choice">
        <label>
          <input
            type="radio"
            checked={delivery}
            onChange={() => form.setValue("delivery", true)}
          />{" "}
          Delivery
        </label>
        <label>
          <input
            type="radio"
            checked={!delivery}
            onChange={() => form.setValue("delivery", false)}
          />{" "}
          Self Pickup
        </label>
      </div>
      <h2>Location &amp; Time</h2>
      <p className="notice">
        Delivery is within the vehicle’s pickup area. Each date and time is
        interpreted in the selected location’s time zone. Rentals are billed per
        started 24-hour period.
      </p>
      <div className="booking-fields">
        {(["pickupLocationId", "returnLocationId"] as const).map((key, i) => (
          <label key={key}>
            {i ? "Return location" : "Pickup location"}
            <select {...form.register(key)} disabled={i === 1 && same}>
              {options.locations
                .filter((l) => i || l.id === options.vehicle.locationId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.timeZone}
                  </option>
                ))}
            </select>
          </label>
        ))}
        <label className="booking-wide check-label">
          <input
            type="checkbox"
            checked={same}
            onChange={(e) => {
              setSame(e.target.checked);
              if (e.target.checked)
                form.setValue(
                  "returnLocationId",
                  form.getValues("pickupLocationId"),
                );
            }}
          />{" "}
          Return to same location
        </label>
        {(["pickupLocal", "returnLocal"] as const).map((key, i) => (
          <label key={key}>
            {i ? "Return date and time" : "Pickup date and time"}
            <input type="datetime-local" {...form.register(key)} />
            {form.formState.errors[key] && (
              <span role="alert" className="field-error">
                {form.formState.errors[key]?.message}
              </span>
            )}
          </label>
        ))}
      </div>
      <button disabled={busy} className="button button-primary">
        {busy ? "Checking availability…" : "Continue to Extra Services"}
      </button>
    </form>
  );
}
function DriverForm({
  options,
  booking,
  onSave,
  busy,
}: {
  options: BookingOptions;
  booking: BookingView;
  onSave: (driver: DriverInput, insurance: string | null) => Promise<void>;
  busy: boolean;
}) {
  const [insurance, setInsurance] = useState(booking.insurancePlanId ?? "");
  const form = useForm<DriverInput>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      firstName: booking.driver?.firstName ?? "",
      lastName: booking.driver?.lastName ?? "",
      age: booking.driver?.age,
      phone: booking.driver?.phone ?? "",
      chauffeur: booking.driver?.chauffeur ?? false,
      license: "",
      ageConfirmed: booking.driver?.ageConfirmed as true | undefined,
    },
  });
  const chauffeur = useWatch({ control: form.control, name: "chauffeur" });
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((v) => onSave(v, insurance || null))}
    >
      <h2>Driver Details</h2>
      <div className="booking-choice">
        <label>
          <input
            type="radio"
            checked={!chauffeur}
            onChange={() => form.setValue("chauffeur", false)}
          />{" "}
          Self Drive
        </label>
        <label>
          <input
            type="radio"
            checked={chauffeur}
            onChange={() => form.setValue("chauffeur", true)}
          />{" "}
          Acting Driver / Chauffeur
        </label>
      </div>
      {chauffeur && (
        <p className="notice">
          An acting driver service is added at its published daily rate. Driver
          assignment follows verification and payment.
        </p>
      )}
      <div className="booking-fields">
        {(["firstName", "lastName", "age", "phone", "license"] as const)
          .filter((k) => k !== "license" || !chauffeur)
          .map((key) => (
            <label key={key}>
              {
                {
                  firstName: "First name",
                  lastName: "Last name",
                  age: "Driver age",
                  phone: "Phone number",
                  license: booking.driver?.hasLicense
                    ? "Driving license number (re-enter to edit)"
                    : "Driving license number",
                }[key]
              }
              <input
                type={key === "age" ? "number" : "text"}
                autoComplete={key === "license" ? "off" : undefined}
                {...form.register(
                  key,
                  key === "age" ? { valueAsNumber: true } : {},
                )}
              />
              {form.formState.errors[key] && (
                <span role="alert" className="field-error">
                  {form.formState.errors[key]?.message}
                </span>
              )}
            </label>
          ))}
      </div>
      <label className="check-label">
        <input type="checkbox" {...form.register("ageConfirmed")} /> I confirm
        the driver is at least 21 years old.
      </label>
      {form.formState.errors.ageConfirmed && (
        <p role="alert" className="field-error">
          {form.formState.errors.ageConfirmed.message}
        </p>
      )}
      <div className="notice">
        <strong>Document verification pending</strong>
        <p>
          Identity upload is unavailable until private persistent storage is
          configured. Do not send documents by email. An unpaid hold does not
          authorize vehicle collection.
        </p>
      </div>
      <h2>Insurance</h2>
      <label>
        Insurance plan
        <select
          value={insurance}
          onChange={(e) => setInsurance(e.target.value)}
        >
          <option value="">No additional coverage</option>
          {options.insurance.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {money(p.pricePerDayCents)}/day
            </option>
          ))}
        </select>
      </label>
      <button disabled={busy} className="button button-primary">
        {busy ? "Saving…" : "Review Booking"}
      </button>
    </form>
  );
}
export function BookingWizard({
  options,
  initial,
  step: requestedStep,
}: {
  options: BookingOptions;
  initial: BookingView | null;
  step: string;
}) {
  const router = useRouter();
  const [booking, setBooking] = useState(initial);
  const [price, setPrice] = useState(initial?.price ?? null);
  const [error, setError] = useState(initial?.quoteError ?? "");
  const [busy, setBusy] = useState(false);
  const [extras, setExtras] = useState(
    (initial?.extras ?? []).filter((e) =>
      options.extras.some((s) => s.id === e.serviceId),
    ),
  );
  const [coupon, setCoupon] = useState(initial?.couponCode ?? "");
  const key = useRef<string | null>(null);
  const quoteSequence = useRef(0);
  const steps = [
    "Location & Time",
    "Extra Services",
    "Driver Details",
    "Review",
    "Reservation",
  ];
  const step =
    booking?.status !== "DRAFT" && booking
      ? "reservation"
      : booking
        ? ["location", "extras", "driver", "review"].includes(requestedStep)
          ? requestedStep
          : "extras"
        : "location";
  const index = [
    "location",
    "extras",
    "driver",
    "review",
    "reservation",
  ].indexOf(step);
  async function act(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save booking.");
    } finally {
      setBusy(false);
    }
  }
  function go(next: string, b = booking) {
    if (b) {
      router.push(`/booking/${b.id}?step=${next}`);
      router.refresh();
    }
  }
  async function update(data: unknown) {
    const result: BookingView = await request(
      `/api/bookings/${booking!.id}`,
      data,
      "PATCH",
    );
    setBooking(result);
    setPrice(result.price);
    return result;
  }
  async function preview(selected: typeof extras) {
    setExtras(selected);
    const sequence = ++quoteSequence.current;
    try {
      const q = await request(`/api/bookings/${booking!.id}/quote`, {
        extras: selected,
      });
      if (sequence === quoteSequence.current) {
        setPrice(q.price);
        setError("");
      }
    } catch (e) {
      if (sequence === quoteSequence.current)
        setError(e instanceof Error ? e.message : "Unable to update quote.");
    }
  }
  return (
    <>
      <ol className="booking-progress" aria-label="Booking progress">
        {steps.map((s, i) => (
          <li key={s} aria-current={index === i ? "step" : undefined}>
            <span>{i < index ? "✓" : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="booking-layout">
        <section className="booking-panel">
          {error && (
            <p role="alert" className="field-error">
              {error}{" "}
              <button
                type="button"
                onClick={() => {
                  router.refresh();
                }}
              >
                Reload quote
              </button>
            </p>
          )}
          {step === "location" && (
            <PeriodForm
              options={options}
              booking={booking}
              busy={busy}
              onSave={(v) =>
                act(async () => {
                  if (booking) {
                    const b = await update({
                      kind: "period",
                      version: booking.version,
                      ...v,
                    });
                    go("extras", b);
                  } else {
                    key.current ??= crypto.randomUUID();
                    const b = await request("/api/bookings", {
                      ...v,
                      vehicleSlug: options.vehicle.slug,
                      idempotencyKey: key.current,
                    });
                    router.push(`/booking/${b.id}?step=extras`);
                    router.refresh();
                  }
                })
              }
            />
          )}
          {step === "extras" && booking && (
            <>
              <h2>Extra Services</h2>
              <p>Add the services you need for your trip.</p>
              {options.extras
                .filter((e) => e.code !== "chauffeur")
                .map((service) => {
                  const selected = extras.find(
                    (e) => e.serviceId === service.id,
                  );
                  return (
                    <div className="extra-service" key={service.id}>
                      <label>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={Boolean(selected)}
                          onChange={(e) =>
                            void preview(
                              e.target.checked
                                ? [
                                    ...extras,
                                    { serviceId: service.id, quantity: 1 },
                                  ]
                                : extras.filter(
                                    (v) => v.serviceId !== service.id,
                                  ),
                            )
                          }
                        />
                        <strong>{service.name}</strong>
                        <small>{service.description}</small>
                      </label>
                      <span>
                        {money(service.priceCents)}
                        {service.perDay ? " / day" : " / rental"}
                      </span>
                      {selected && (
                        <label>
                          Quantity
                          <select
                            disabled={busy}
                            value={selected.quantity}
                            onChange={(e) =>
                              void preview(
                                extras.map((v) =>
                                  v.serviceId === service.id
                                    ? { ...v, quantity: Number(e.target.value) }
                                    : v,
                                ),
                              )
                            }
                          >
                            {[1, 2, 3, 4].map((q) => (
                              <option key={q}>{q}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  );
                })}
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const b = await update({
                      kind: "extras",
                      version: booking.version,
                      extras,
                    });
                    go("driver", b);
                  })
                }
              >
                {busy ? "Saving…" : "Continue to Driver Details"}
              </button>
            </>
          )}
          {step === "driver" && booking && (
            <DriverForm
              options={options}
              booking={booking}
              busy={busy}
              onSave={(driver, insurancePlanId) =>
                act(async () => {
                  const b = await update({
                    kind: "driver",
                    version: booking.version,
                    driver,
                    insurancePlanId,
                  });
                  go("review", b);
                })
              }
            />
          )}
          {step === "review" && booking && (
            <>
              <h2>Review Your Booking</h2>
              <p>{booking.vehicle.name}</p>
              <p>
                {booking.pickupLocation} ·{" "}
                {booking.pickupLocal.replace("T", " ")} ({booking.pickupZone})
              </p>
              <p>
                {booking.returnLocation} ·{" "}
                {booking.returnLocal.replace("T", " ")} ({booking.returnZone})
              </p>
              <p>
                Driver:{" "}
                {booking.driver
                  ? `${booking.driver.firstName} ${booking.driver.lastName}`
                  : "Driver details required"}
              </p>
              <PriceSummary price={price} />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    await update({
                      kind: "coupon",
                      version: booking.version,
                      code: coupon,
                    });
                  });
                }}
              >
                <label>
                  Coupon code
                  <input
                    value={coupon}
                    maxLength={40}
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                </label>
                <button disabled={busy} className="button button-outline">
                  Apply Coupon
                </button>
              </form>
              <p className="notice">
                Reserve an unpaid {options.policy.holdMinutes}-minute hold. No
                payment will be taken. Prices include a refundable deposit;
                document verification and verified payment are required before
                confirmation.
              </p>
              <button
                disabled={busy || !booking.driver || !booking.quoteHash}
                className="button button-primary"
                onClick={() =>
                  void act(async () => {
                    const b: BookingView = await request(
                      `/api/bookings/${booking.id}/hold`,
                      {
                        version: booking.version,
                        quoteHash: booking.quoteHash,
                      },
                    );
                    setBooking(b);
                    setPrice(b.price);
                    go("reservation", b);
                  })
                }
              >
                {busy ? "Reserving securely…" : "Reserve Temporary Hold"}
              </button>
            </>
          )}
          {step === "reservation" && booking && (
            <>
              <h2>
                {booking.status === "PENDING_PAYMENT"
                  ? "Vehicle temporarily held"
                  : `Booking ${booking.status.toLowerCase().replaceAll("_", " ")}`}
              </h2>
              <p>
                Reference: <strong>{booking.reference}</strong>
              </p>
              <p>Status: {booking.status}</p>
              {booking.holdExpiresAt && (
                <p>
                  Hold expires:{" "}
                  {new Date(booking.holdExpiresAt).toLocaleString("en-US", {
                    timeZone: booking.pickupZone,
                  })}{" "}
                  ({booking.pickupZone})
                </p>
              )}
              <p className="notice">
                Payment integration is not enabled. No charge has been made and
                this is not a confirmed rental. An unpaid hold expires
                automatically.
              </p>
              <button className="button button-primary" disabled>
                Payment unavailable
              </button>
              <Link
                className="button button-outline"
                href={`/dashboard/bookings/${booking.id}`}
              >
                View Booking Details
              </Link>
            </>
          )}
          {booking?.status === "DRAFT" && index > 0 && (
            <button
              className="button button-outline"
              type="button"
              disabled={busy}
              onClick={() => go(["location", "extras", "driver"][index - 1])}
            >
              Back
            </button>
          )}
        </section>
        <aside className="booking-panel booking-summary">
          <h2>Booking Details</h2>
          {booking && (
            <Image
              src={booking.vehicle.image}
              alt={booking.vehicle.name}
              width={320}
              height={190}
            />
          )}
          <h3>{options.vehicle.name}</h3>
          <p>Base rate: {money(options.vehicle.dailyPriceCents)} / day</p>
          <PriceSummary price={price} />
          <Link href={`/cars/${options.vehicle.slug}`}>View Car Details</Link>
        </aside>
      </div>
    </>
  );
}
