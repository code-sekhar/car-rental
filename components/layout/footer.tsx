import Link from "next/link";
import { cacheLife } from "next/cache";
import { ArrowUp, Mail, MapPin, Send } from "lucide-react";
import { Logo } from "./logo";
const groups = [
  {
    title: "About Company",
    links: [
      ["Our Company", "/#why-choose-us"],
      ["Why Veltrix", "/#why-choose-us"],
      ["How It Works", "/#how-it-works"],
      ["Our Collection", "/cars"],
      ["Travel Journal", "/#journal"],
    ],
  },
  {
    title: "Vehicles Type",
    links: [
      ["All Vehicles", "/cars"],
      ["SUVs", "/cars?category=SUV"],
      ["Pickups", "/cars?category=Pickup"],
      ["Cars", "/cars?category=Sedan"],
      ["Convertibles", "/cars?category=Convertible"],
    ],
  },
  {
    title: "Quick Links",
    links: [
      ["Find a Car", "/cars"],
      ["Popular Cars", "/#popular-cars"],
      ["Car Categories", "/#categories"],
      ["Rental Plans", "/#rental-info"],
      ["FAQs", "/#faq"],
    ],
  },
  {
    title: "Rental Information",
    links: [
      ["Getting Started", "/#how-it-works"],
      ["Pickup Locations", "/cars"],
      ["Driver Requirements", "/#faq"],
      ["Rental Pricing", "/#rental-info"],
      ["Contact", "/#contact"],
    ],
  },
];
export async function Footer() {
  "use cache";
  cacheLife("days");
  return (
    <footer className="site-footer reference-footer" id="contact">
      <a className="back-top" href="#main-content" aria-label="Back to top">
        <ArrowUp size={21} />
      </a>
      <div className="container footer-top">
        <div className="footer-columns">
          {groups.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="footer-contact">
            <h3>Contact Info</h3>
            <p>
              <span className="footer-icon">
                <MapPin size={18} />
              </span>
              Explore our sample pickup cities
            </p>
            <p>
              <span className="footer-icon">
                <Mail size={18} />
              </span>
              Contact details coming soon
            </p>
            <div className="newsletter-preview">
              <input
                type="email"
                aria-label="Newsletter email, coming soon"
                placeholder="Newsletter coming soon"
                disabled
              />
              <button
                disabled
                type="button"
                aria-label="Newsletter subscription coming soon"
              >
                <Send size={17} />
              </button>
            </div>
            <p className="small">
              Portfolio preview. Demo vehicles and illustrative rates.
              Reservations are not yet available.
            </p>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <p>
            © {new Date().getFullYear()} Veltrix Rentals. All rights reserved.
          </p>
          <Logo light />
        </div>
      </div>
    </footer>
  );
}
