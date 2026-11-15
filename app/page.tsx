import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  ChevronDown,
  Crown,
  Heart,
  Headphones,
  History,
  Quote,
  Scan,
  Star,
  ThumbsUp,
  UserRoundCheck,
} from "lucide-react";
import { SearchForm } from "@/components/home/search-form";
import { SectionHeading } from "@/components/home/section-heading";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { Collection } from "@/components/home/collection";
import { Carousel } from "@/components/home/carousel";
import { Pricing } from "@/components/home/pricing";
import { homeInventory } from "@/lib/server/vehicles";

const faqs = [
  [
    "How Old Do I Need To Be To Rent A Car?",
    "Age requirements depend on the vehicle and rental provider. The booking phase will show the applicable minimum age before a reservation can be made.",
  ],
  [
    "What Documents Do I Need To Rent A Car?",
    "You will need a valid driving license and identification. Required documents and eligibility checks will be listed before booking; this preview does not collect identity documents.",
  ],
  [
    "What Types Of Vehicles Are Available For Rent?",
    "Explore sedans, spacious SUVs, sports cars, pickups and convertibles. You can browse our demonstration collection to find the right vehicle for your plans.",
  ],
  [
    "Can I Rent A Car With A Debit Card?",
    "Accepted payment methods will be displayed in checkout when the payment provider is connected. No payment details are collected in this preview.",
  ],
  [
    "What Is Your Fuel Policy?",
    "Fuel requirements vary by vehicle. The applicable fuel policy will be shown in the rental terms before you confirm a booking.",
  ],
  [
    "Can I Add Additional Drivers To My Rental Agreement?",
    "Additional drivers are planned as an optional booking service. Each driver will need to meet the vehicle’s age and license requirements.",
  ],
  [
    "What Happens If I Return The Car Late?",
    "Late-return charges will be disclosed in the rental agreement. Contact the rental provider before your scheduled return if your plans change.",
  ],
];
const categories = [
  { name: "Crossover", category: "Crossover", image: 1 },
  { name: "Sports Coupe", category: "Sports", image: 2 },
  { name: "Sedan", category: "Sedan", image: 3 },
  { name: "Pickup", category: "Pickup", image: 4 },
  { name: "Family MPV", category: "SUV", image: 5 },
  { name: "Convertible", category: "Convertible", image: 2 },
  { name: "SUV", category: "SUV", image: 1 },
];
const stories = [
  {
    name: "Rabien Ustoc",
    location: "New York, USA",
    image: 11,
    text: "The right car can make a vacation feel effortless. A comfortable ride, space for the essentials and time to enjoy the journey.",
  },
  {
    name: "Hardley Vanessa",
    location: "Los Angeles, USA",
    image: 15,
    text: "For a business trip or a weekend away, clear vehicle information helps you choose with confidence before you head out.",
  },
  {
    name: "Wilson",
    location: "Miami, USA",
    image: 13,
    text: "A family adventure starts with enough room for everyone. Explore the collection and find the space your next trip needs.",
  },
];
const articles = [
  {
    title: "The 2024 Ford F-150 Raptor — A First Look",
    category: "Journey",
    image: "journal-mercedes",
    text: "Choose a vehicle for the journey you have planned. Compare seating, luggage space and transmission, then review the rental terms before setting out.",
  },
  {
    title: "The Joy of the Open Road: Plan Your Next Drive",
    category: "Tour & trip",
    image: "journal-driving",
    text: "Plan your route, leave time for rest stops and check the weather. A little preparation helps make your next drive more relaxed and enjoyable.",
  },
  {
    title: "Dedicated To Cars, Covering Everything",
    category: "Updates",
    image: "journal-ford",
    text: "From practical pickups to comfortable city cars, explore the details that matter for your journey. Our demo collection shows a range of options.",
  },
];
export default async function Home() {
  const { demoVehicles, popularVehicles, recommendedVehicles } =
    await homeInventory();
  return (
    <main id="main-content" className="home-page">
      <section className="home-hero">
        <div className="container home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-trust-pill">
              <ThumbsUp size={24} fill="currentColor" />
              <span>Your next journey starts with Veltrix</span>
            </p>
            <h1>
              <span>Find Your Best</span>Dream Car For Rental
            </h1>
            <p>
              Experience the ultimate in comfort, performance, and
              sophistication with our car rental collection. From sleek sedans
              and stylish coupes to spacious SUVs and elegant convertibles, find
              a vehicle to suit your preferences and lifestyle.
            </p>
            <Link href="/cars" className="button button-outline">
              View all Cars <ArrowRight size={15} />
            </Link>
          </div>
          <div className="home-hero-car">
            <Image
              src="/images/home/hero-suv.webp"
              alt="Dark gray Mercedes-Benz SUV"
              fill
              preload
              sizes="(max-width: 600px) 95vw, (max-width: 1000px) 55vw, 850px"
            />
          </div>
        </div>
      </section>
      <div className="container home-search">
        <SearchForm />
      </div>
      <section className="section home-how" id="how-it-works">
        <div className="container">
          <SectionHeading
            title="How It Works"
            description="Booking a car rental is a straightforward process that typically involves the following steps"
          />
          <div className="home-steps">
            {[
              {
                title: "1. Choose Date & Locations",
                text: "Determine the date & location for your car rental. Consider factors such as your travel itinerary, pickup/drop-off locations and duration of rental.",
              },
              {
                title: "2. Pick-Up Locations",
                text: "Check the availability of your desired vehicle type for your chosen dates and location. Review the rental rates, taxes, fees, and any additional charges.",
              },
              {
                title: "3. Book Your Car",
                text: "Once you’ve found a rental option, proceed to make a reservation. Have your driver’s license, contact information, and payment details ready when booking launches.",
              },
            ].map((step, i) => (
              <article key={step.title}>
                <div className="home-step-icon">
                  <Image
                    src={`/images/home/step-${i + 1}.svg`}
                    alt=""
                    width={42}
                    height={42}
                  />
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section home-tinted home-popular" id="popular-cars">
        <div className="container">
          <SectionHeading
            title="Explore Most Popular Cars"
            description="Here’s a list of some of the most popular cars, ready to inspire your next journey"
          />
          <Collection
            items={popularVehicles.map((vehicle) => ({
              brand: vehicle.brand,
              card: <VehicleCard key={vehicle.slug} vehicle={vehicle} />,
            }))}
          />
          <p className="demo-caption">
            Demonstration fleet · Illustrative ratings and rates · Reservations
            are not yet available
          </p>
        </div>
      </section>
      <section className="section home-categories" id="categories">
        <div className="container">
          <SectionHeading
            title="Most Popular Cartypes"
            description="Find a car category for your next journey, with the comfort, space and features you need."
          />
          <Carousel label="vehicle categories" className="category-carousel">
            {categories.map((category, i) => (
              <Link
                key={`${category.name}-${i}`}
                className={`home-category ${i === 3 ? "category-highlight" : ""}`}
                href={`/cars?category=${category.category}`}
              >
                <Image
                  src={`/images/home/category-${category.image}.svg`}
                  width={80}
                  height={45}
                  alt=""
                />
                <h3>{category.name}</h3>
                <p>
                  {
                    demoVehicles.filter((v) => v.category === category.category)
                      .length
                  }{" "}
                  demo cars
                </p>
              </Link>
            ))}
          </Carousel>
          <div className="section-action">
            <Link href="/cars" className="button button-outline">
              View all Cars <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section home-facts">
        <Image
          className="facts-car"
          src="/images/home/facts-car.webp"
          alt=""
          width={240}
          height={330}
        />
        <div className="container">
          <SectionHeading
            title="Facts By The Numbers"
            description="Get to know the Veltrix demonstration collection"
          />
          <div className="home-stat-grid">
            {[
              { icon: Heart, value: "0", label: "Completed rentals" },
              {
                icon: CarFront,
                value: String(demoVehicles.length),
                label: "Demo cars",
              },
              { icon: Headphones, value: "3", label: "Sample pickup cities" },
              {
                icon: History,
                value: String(
                  new Set(demoVehicles.map((v) => v.category)).size,
                ),
                label: "Vehicle categories",
              },
            ].map(({ icon: Icon, value, label }) => (
              <div className="home-stat" key={label}>
                <span>
                  <Icon size={35} />
                </span>
                <div>
                  <strong>{value}</strong>
                  <p>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section home-tinted home-recommended">
        <div className="container">
          <SectionHeading
            title="Recommended Rental Cars"
            description="Here are some versatile options that cater to different needs"
          />
          <Carousel label="recommended cars" className="recommended-carousel">
            {recommendedVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.slug} vehicle={vehicle} recommended />
            ))}
          </Carousel>
          <div className="section-action">
            <Link href="/cars" className="button button-outline">
              View all Cars <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section home-why" id="why-choose-us">
        <div className="container">
          <SectionHeading
            title="Why Choose Us"
            description="We are innovative and passionate about the journeys ahead."
          />
          <div className="benefit-grid">
            {[
              {
                icon: Scan,
                title: "Easy & Fast Booking",
                text: "A straightforward rental experience, from finding the right vehicle to reviewing your journey details.",
              },
              {
                icon: Crown,
                title: "Many Pickup Locations",
                text: "Explore our sample cities and choose a vehicle that fits your travel plans and pickup preferences.",
              },
              {
                icon: UserRoundCheck,
                title: "Customer Satisfaction",
                text: "Clear information, thoughtful choices and an experience designed around the needs of every driver.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article className="benefit-card" key={title}>
                <span>
                  <Icon size={33} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section home-testimonials">
        <div className="container">
          <SectionHeading
            title="What People Say About Us?"
            description="A preview of the customer experience we’re building"
          />
          <div className="home-testimonial-grid">
            {stories.map((story) => (
              <figure className="home-testimonial" key={story.name}>
                <figcaption>
                  <Image
                    src={`/images/home/avatar-${story.image}.webp`}
                    width={52}
                    height={52}
                    alt=""
                  />
                  <div>
                    <strong>{story.name}</strong>
                    <span>{story.location}</span>
                  </div>
                  <Quote size={32} fill="currentColor" />
                </figcaption>
                <blockquote>{story.text}</blockquote>
                <p className="story-sample">
                  Illustrative story · not a verified review
                </p>
                <div
                  className="story-stars"
                  aria-label="Illustrative five-star rating"
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={15} fill="currentColor" />
                  ))}
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>
      <section className="section home-tinted home-faq" id="faq">
        <div className="container faq-container">
          <SectionHeading
            title="Frequently Asked Questions"
            description="Find answers to your questions before your next journey"
          />
          <div className="faq-list">
            {faqs.map(([question, answer], i) => (
              <details key={question} open={i === 2}>
                <summary>
                  {question}
                  <ChevronDown size={17} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="section home-pricing" id="rental-info">
        <div className="container">
          <SectionHeading
            title="Transparent Pricing For You"
            description="Choose a package that suits you"
          />
          <Pricing />
        </div>
      </section>
      <section className="container home-app">
        <div>
          <h2>
            Veltrix Rentals User
            <br />
            Friendly App Experience
          </h2>
          <p>
            Find your next drive on your phone, tablet or desktop.
            <br />A dedicated mobile app is planned for the future.
          </p>
          <div className="app-store-buttons">
            <button
              disabled
              type="button"
              aria-label="Google Play app, coming soon"
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="26"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3 2 15 12 3 22V2Zm13 9 3-3L5 1l11 10Zm0 2 3 3-14 7 11-10Zm1-1 3-3 3 2v2l-3 2-3-3Z" />
              </svg>
              <span>
                Coming soon on<strong>Google Play</strong>
              </span>
            </button>
            <button
              disabled
              type="button"
              aria-label="App Store app, coming soon"
            >
              <svg
                viewBox="0 0 24 26"
                width="24"
                height="26"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M16 1c0 3-2 5-4 5 0-3 2-5 4-5ZM18 13c0-3 2-4 3-5-2-3-5-3-7-2-2 1-3 1-5 0-5-2-8 3-7 8 1 5 4 11 7 11 2 0 2-1 4-1s3 1 4 1c3 0 5-5 6-7-3-1-5-3-5-5Z" />
              </svg>
              <span>
                Coming soon on<strong>App Store</strong>
              </span>
            </button>
          </div>
        </div>
        <div className="home-app-car">
          <Image
            src="/images/home/app-car.webp"
            alt="Red Audi sports car in front of circular accents"
            fill
            sizes="(max-width: 600px) 90vw, 550px"
          />
        </div>
      </section>
      <section className="section home-journal" id="journal">
        <div className="container">
          <SectionHeading
            title="News & Insights For You"
            description="Stories, ideas and a little inspiration for the road ahead"
          />
          <div className="journal-grid">
            {articles.map((article) => (
              <article className="journal-card" key={article.title}>
                <div className="journal-image">
                  <Image
                    src={`/images/home/${article.image}.webp`}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 100vw, 33vw"
                  />
                </div>
                <div>
                  <span className="article-category">{article.category}</span>
                  <h3>{article.title}</h3>
                  <p className="article-excerpt">
                    Explore the details that make a journey memorable, from
                    choosing your car to planning your next adventure.
                  </p>
                  <details>
                    <summary>
                      Read Article <ArrowRight size={15} />
                    </summary>
                    <p>{article.text}</p>
                  </details>
                  <div className="article-author">
                    <span>
                      <Image
                        src="/images/home/avatar-13.webp"
                        alt=""
                        width={26}
                        height={26}
                      />
                      Veltrix Editorial
                    </span>
                    <span>Rental guide</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
