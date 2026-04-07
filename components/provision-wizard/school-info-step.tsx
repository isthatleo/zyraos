"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import * as countryCodes from "country-codes-list";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Badge } from "@/components/ui/badge";
import { Globe, DollarSign, Phone } from "lucide-react";

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
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "other", label: "Other" },
];

export function SchoolInfoStep({ data, onUpdate }: SchoolInfoStepProps) {
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

  const handleNameChange = (name: string) => {
    updateField("name", name);
    // Only update subdomain if it's empty or was previously auto-generated
    const currentSlug = generateSlug(data.name);
    if (!data.subdomain || data.subdomain === currentSlug) {
      updateField("subdomain", generateSlug(name));
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="school-name">School Name *</Label>
          <Input
            id="school-name"
            placeholder="Enter school name"
            value={data.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="border-gray-300 focus:ring-orange-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="school-type">School Type *</Label>
          <Select value={data.type} onValueChange={(value) => updateField("type", value)}>
            <SelectTrigger className="border-gray-300">
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
            <SelectTrigger className="border-gray-300">
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
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="Enter city"
            value={data.city}
            onChange={(e) => updateField("city", e.target.value)}
            className="border-gray-300"
          />
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="border-gray-300"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="subdomain">School URL *</Label>
          <div className="flex">
            <Input
              id="subdomain"
              placeholder="school-name"
              value={data.subdomain}
              onChange={(e) => updateField("subdomain", e.target.value)}
              required
              className="rounded-r-none border-gray-300 focus:ring-orange-500"
            />
            <span className="inline-flex items-center px-4 text-sm text-gray-600 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md font-medium">
              .roxan.com
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            The unique web address for your school's dashboard.
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
          className="border-gray-300"
        />
      </div>

      {data.currencyCode && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-full">
              <DollarSign className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-orange-900">Detected Local Currency</p>
              <p className="text-xs text-orange-700">Based on your country selection</p>
            </div>
          </div>
          <div className="text-right">
            <Badge className="bg-orange-200 text-orange-800 hover:bg-orange-200 border-none font-bold">
              {data.currencyCode} - {data.currencyName}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
