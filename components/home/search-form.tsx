"use client";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Search } from "lucide-react";
import { rentalSearchSchema, type RentalSearch } from "@/lib/search";
export function SearchForm({
  initial,
  locations = ["Miami", "New York", "Los Angeles"],
  preserve = {},
}: {
  initial?: Partial<RentalSearch>;
  locations?: string[];
  preserve?: Record<string, string>;
}) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RentalSearch>({
    resolver: zodResolver(rentalSearchSchema),
    defaultValues: {
      location: initial?.location ?? "",
      pickup: initial?.pickup ?? "",
      return: initial?.return ?? "",
    },
  });
  function search(data: RentalSearch) {
    const params = new URLSearchParams(preserve);
    params.delete("page");
    params.delete("location");
    if (data.location) params.set("location", data.location);
    params.set("pickup", data.pickup);
    params.set("return", data.return);
    router.push(`/cars?${params.toString()}`);
  }
  return (
    <form
      className="search-form"
      onSubmit={handleSubmit(search)}
      noValidate
      aria-label="Search rental cars"
    >
      <div className="search-field">
        <label htmlFor="search-location">Pickup Location</label>
        <div className="input-icon">
          <MapPin size={15} />
          <select id="search-location" {...register("location")}>
            <option value="">Enter City, Airport, or Address</option>
            {locations.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>
      {(["pickup", "return"] as const).map((name) => (
        <div className="search-field" key={name}>
          <label htmlFor={`search-${name}-date`}>
            {name === "pickup" ? "Pickup" : "Return"} Date
          </label>
          <Controller
            control={control}
            name={name}
            render={({ field }) => {
              const [date = "", time = ""] = field.value.split("T");
              return (
                <div className="search-datetime">
                  <input
                    id={`search-${name}-date`}
                    type="date"
                    value={date}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    onChange={(e) =>
                      field.onChange(`${e.target.value}T${time}`)
                    }
                    aria-label={`${name === "pickup" ? "Pickup" : "Return"} Date`}
                    aria-invalid={!!errors[name]}
                    aria-describedby={
                      errors[name] ? `${name}-error` : undefined
                    }
                  />
                  <input
                    type="time"
                    value={time}
                    onBlur={field.onBlur}
                    onChange={(e) =>
                      field.onChange(`${date}T${e.target.value}`)
                    }
                    aria-label={`${name === "pickup" ? "Pickup" : "Return"} Time`}
                    aria-invalid={!!errors[name]}
                    aria-describedby={
                      errors[name] ? `${name}-error` : undefined
                    }
                  />
                </div>
              );
            }}
          />
          {errors[name] && (
            <p className="field-error" id={`${name}-error`} role="alert">
              {errors[name]?.message}
            </p>
          )}
        </div>
      ))}
      <button
        type="submit"
        disabled={isSubmitting}
        className="button button-primary search-button"
      >
        <Search size={16} />
        Search
      </button>
    </form>
  );
}
