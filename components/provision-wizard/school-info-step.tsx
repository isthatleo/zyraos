"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import * as countryCodes from "country-codes-list";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Badge } from "@/components/ui/badge";
import { Globe, DollarSign, Phone, MapPin } from "lucide-react";
import { normalizeTenantSlug } from "@/lib/tenant-url";

interface SchoolInfoData {
  name: string;
  type: string;
  country: string;
  city: string;
  contactEmail: string;
  phone: string;
  address: string;
  subdomain: string;
  currencyCode?: string;
  currencyName?: string;
  countryCode?: string;
}

interface SchoolInfoStepProps {
  data: SchoolInfoData;
  onUpdate: (data: SchoolInfoData) => void;
}

const SCHOOL_TYPES = [
  { value: "primary", label: "Primary School" },
  { value: "secondary", label: "Secondary School" },
  { value: "high_school", label: "High School" },
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "vocational", label: "Vocational / Technical College" },
];

const CITY_LIBRARY: Record<string, string> = {
  kampala: "UG",
  entebbe: "UG",
  mbarara: "UG",
  gulu: "UG",
  nairobi: "KE",
  mombasa: "KE",
  kisumu: "KE",
  kigali: "RW",
  accra: "GH",
  kumasi: "GH",
  lagos: "NG",
  abuja: "NG",
  "dar es salaam": "TZ",
  arusha: "TZ",
  johannesburg: "ZA",
  "cape town": "ZA",
  london: "GB",
  "new york": "US",
};

export function SchoolInfoStep({ data, onUpdate }: SchoolInfoStepProps) {
  const [cityHint, setCityHint] = useState("");
  const tenantSuffix = typeof window !== "undefined" && window.location.hostname === "localhost"
    ? `.localhost:${window.location.port || "3000"}/admins`
    : ".roxan.com/admins";
  // Get all countries with their metadata, ensuring unique country codes
  const countries = useMemo(() => {
    const allCountries = countryCodes.all();
    const uniqueMap = new Map();
    allCountries.forEach(country => {
      if (!uniqueMap.has(country.countryCode)) {
        uniqueMap.set(country.countryCode, country);
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => 
      a.countryNameEn.localeCompare(b.countryNameEn)
    );
  }, []);

  const updateField = (field: keyof SchoolInfoData, value: any) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.countryCode === countryCode);
    if (country) {
      onUpdate({
        ...data,
        country: country.countryNameEn,
        countryCode: country.countryCode,
        currencyCode: country.currencyCode,
        currencyName: country.currencyNameEn,
      });
    }
  };

  const handleCityChange = (city: string) => {
    const inferredCode = CITY_LIBRARY[city.trim().toLowerCase()];
    const country = inferredCode ? countries.find(c => c.countryCode === inferredCode) : null;
    setCityHint(country ? country.countryNameEn : "");
    if (country && !data.countryCode) {
      onUpdate({
        ...data,
        city,
        country: country.countryNameEn,
        countryCode: country.countryCode,
        currencyCode: country.currencyCode,
        currencyName: country.currencyNameEn,
      });
      return;
    }
    updateField("city", city);
  };

  const handleNameChange = (name: string) => {
    // Only update subdomain if it's empty or was previously auto-generated
    const currentSlug = generateSlug(data.name);
    if (!data.subdomain || data.subdomain === currentSlug) {
      onUpdate({ ...data, name, subdomain: generateSlug(name) });
      return;
    }
    onUpdate({ ...data, name });
  };

  const generateSlug = (name: string) => {
    return normalizeTenantSlug(name);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-muted/30 p-4">
        <h3 className="font-semibold">School identity and location</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Country selection drives currency defaults and phone number formatting. City suggestions help auto-detect the country when possible.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="school-name">School Name *</Label>
          <Input
            id="school-name"
            placeholder="Enter school name"
            value={data.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="school-type">School Type *</Label>
          <Select value={data.type} onValueChange={(value) => updateField("type", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select school type" />
            </SelectTrigger>
            <SelectContent>
              {SCHOOL_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country" className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-500" />
            Country *
          </Label>
          <Select value={data.countryCode} onValueChange={handleCountryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {countries.map((country) => (
                <SelectItem key={country.countryCode} value={country.countryCode}>
                  {country.countryNameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            City
          </Label>
          <Input
            id="city"
            placeholder="Enter city"
            list="school-city-library"
            value={data.city}
            onChange={(e) => handleCityChange(e.target.value)}
          />
          <datalist id="school-city-library">
            {Object.keys(CITY_LIBRARY).map((city) => (
              <option key={city} value={city.replace(/\b\w/g, (char) => char.toUpperCase())} />
            ))}
          </datalist>
          {cityHint ? <p className="text-xs text-muted-foreground">Country suggestion: {cityHint}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            Phone Number *
          </Label>
          <div className="relative">
            <PhoneInput
              placeholder="Enter phone number"
              value={data.phone}
              onChange={(value) => updateField("phone", value || "")}
              defaultCountry={data.countryCode as any}
              international
              countryCallingCodeEditable={false}
              className="phone-field flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-email">Contact Email</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="contact@school.com"
            value={data.contactEmail}
            onChange={(e) => updateField("contactEmail", e.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="subdomain">School URL *</Label>
          <div className="flex">
            <Input
              id="subdomain"
              placeholder="school-name"
              value={data.subdomain}
              onChange={(e) => updateField("subdomain", normalizeTenantSlug(e.target.value))}
              required
            />
            <span className="inline-flex items-center rounded-r-md border border-l-0 bg-muted px-4 text-sm font-medium text-muted-foreground">
              {tenantSuffix}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            The unique tenant slug. In development this opens as {data.subdomain || "school-name"}{tenantSuffix}; in production it opens as {data.subdomain || "school-name"}.roxan.com/admins.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">School Address</Label>
        <Textarea
          id="address"
          placeholder="Enter complete school address"
          value={data.address}
          onChange={(e) => updateField("address", e.target.value)}
          rows={3}
        />
      </div>

      {data.currencyCode && (
        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/15 p-2">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Detected Local Currency</p>
              <p className="text-xs text-muted-foreground">Based on your country selection</p>
            </div>
          </div>
          <div className="text-right">
            <Badge className="border-none bg-primary text-primary-foreground font-bold">
              {data.currencyCode} - {data.currencyName}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
