"use client";

import * as React from "react";
import countries from "world-countries";
import * as countryCodes from "country-codes-list";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CountryOption = {
  name: string;
  code: string;
  dialCode: string;
  currencyCode?: string;
};

export type CurrencyOption = {
  code: string;
  name: string;
};

const CITY_LIBRARY: Record<string, string[]> = {
  Uganda: ["Kampala", "Entebbe", "Jinja", "Mbarara", "Gulu", "Mbale", "Arua"],
  Kenya: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"],
  Tanzania: ["Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Zanzibar"],
  Rwanda: ["Kigali", "Butare", "Gisenyi", "Musanze"],
  Ghana: ["Accra", "Kumasi", "Tamale", "Takoradi", "Cape Coast"],
  Nigeria: ["Lagos", "Abuja", "Ibadan", "Kano", "Port Harcourt"],
  "South Africa": ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Gqeberha"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Leeds", "Liverpool"],
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Atlanta"],
};

const countryMeta = countryCodes
  .all()
  .reduce((map, country) => {
    if (!map.has(country.countryCode)) map.set(country.countryCode, country);
    return map;
  }, new Map<string, ReturnType<typeof countryCodes.all>[number]>());

export const COUNTRY_OPTIONS: CountryOption[] = countries
  .map((country) => {
    const code = country.cca2;
    const meta = countryMeta.get(code);
    return {
      name: country.name.common,
      code,
      dialCode: meta?.countryCallingCode || "",
      currencyCode: country.currencies ? Object.keys(country.currencies)[0] : meta?.currencyCode,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const currencyDisplayNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new (Intl as any).DisplayNames(["en"], { type: "currency" })
    : null;

export const CURRENCY_OPTIONS: CurrencyOption[] = Array.from(
  new Set(COUNTRY_OPTIONS.map((country) => country.currencyCode).filter((code): code is string => Boolean(code)))
)
  .sort((a, b) => a.localeCompare(b))
  .map((code) => ({
    code,
    name: currencyDisplayNames?.of?.(code) || code,
  }));

export function getCurrencyOption(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return null;
  return CURRENCY_OPTIONS.find((currency) => currency.code === normalized) || null;
}

export function getCountryOption(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  return COUNTRY_OPTIONS.find((country) => country.name.toLowerCase() === normalized || country.code.toLowerCase() === normalized) || null;
}

export function citySuggestions(country?: string | null) {
  const option = getCountryOption(country);
  const name = option?.name || String(country || "");
  return CITY_LIBRARY[name] || [];
}

export function CurrencySelect({
  id,
  label,
  value,
  onChange,
  className,
  placeholder = "Select currency",
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string, option: CurrencyOption) => void;
  className?: string;
  placeholder?: string;
}) {
  const selected = getCurrencyOption(value);
  const selectValue = selected?.code || "";
  return (
    <div className={cn("space-y-2.5", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Select
        value={selectValue}
        onValueChange={(code) => {
          const option = CURRENCY_OPTIONS.find((currency) => currency.code === code);
          if (option) onChange(option.code, option);
        }}
      >
        <SelectTrigger id={id} className="rounded-2xl border-input bg-background text-foreground">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-80 border border-border bg-popover text-popover-foreground shadow-xl">
          {CURRENCY_OPTIONS.map((currency) => (
            <SelectItem
              key={currency.code}
              value={currency.code}
              className="text-popover-foreground focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            >
              {currency.code} - {currency.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CountrySelect({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string, option: CountryOption) => void;
  className?: string;
}) {
  const selected = getCountryOption(value);
  const selectValue = selected?.code || "";
  return (
    <div className={cn("space-y-2.5", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Select
        value={selectValue}
        onValueChange={(code) => {
          const option = COUNTRY_OPTIONS.find((country) => country.code === code);
          if (option) onChange(option.name, option);
        }}
      >
        <SelectTrigger id={id} className="rounded-2xl border-input bg-background text-foreground">
          <SelectValue placeholder="Select country" />
        </SelectTrigger>
        <SelectContent className="max-h-80 border border-border bg-popover text-popover-foreground shadow-xl">
          {COUNTRY_OPTIONS.map((country) => (
            <SelectItem
              key={country.code}
              value={country.code}
              className="text-popover-foreground focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            >
              {country.name} {country.dialCode ? `(${country.dialCode})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CityInput({
  id,
  label,
  value,
  country,
  onChange,
  className,
}: {
  id?: string;
  label?: string;
  value: string;
  country?: string | null;
  onChange: (value: string) => void;
  className?: string;
}) {
  const listId = `${id || "city"}-suggestions`;
  const suggestions = citySuggestions(country);
  return (
    <div className={cn("space-y-2.5", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Input id={id} list={listId} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl bg-background text-foreground" placeholder="Start typing city / town" />
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.map((city) => <option key={city} value={city} />)}
        </datalist>
      ) : null}
    </div>
  );
}

export function PhoneNumberField({
  id,
  label,
  value,
  country,
  onChange,
  className,
}: {
  id?: string;
  label?: string;
  value: string;
  country?: string | null;
  onChange: (value: string) => void;
  className?: string;
}) {
  const option = getCountryOption(country);
  const normalizedValue = value?.trim().startsWith("+") ? value.trim().replace(/[^\d+]/g, "") : value;
  return (
    <div className={cn("space-y-2.5", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <PhoneInput
        id={id}
        international
        defaultCountry={(option?.code || "UG") as any}
        value={normalizedValue || undefined}
        onChange={(nextValue) => onChange(nextValue || "")}
        className="roxan-phone-field flex min-h-10 rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
      />
    </div>
  );
}
