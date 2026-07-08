"use client";

import { City, Country, State } from "country-state-city";
import { useMemo } from "react";

export function useLocationOptions(countryCode: string, stateCode: string) {
  const countries = useMemo(
    () =>
      Country.getAllCountries().map((c) => ({
        value: c.isoCode,
        label: c.name,
      })),
    []
  );

  const states = useMemo(() => {
    if (!countryCode) return [];
    return State.getStatesOfCountry(countryCode).map((s) => ({
      value: s.isoCode,
      label: s.name,
    }));
  }, [countryCode]);

  const cities = useMemo(() => {
    if (!countryCode || !stateCode) return [];
    return City.getCitiesOfState(countryCode, stateCode).map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [countryCode, stateCode]);

  return { countries, states, cities };
}

export function findCountryCodeByName(name: string | null): string {
  if (!name) return "";
  const match = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return match?.isoCode ?? "";
}

export function findStateCodeByName(countryCode: string, name: string | null): string {
  if (!countryCode || !name) return "";
  const match = State.getStatesOfCountry(countryCode).find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  return match?.isoCode ?? "";
}

export function getCountryName(code: string): string {
  return Country.getCountryByCode(code)?.name ?? code;
}

export function getStateName(countryCode: string, code: string): string {
  return State.getStateByCodeAndCountry(code, countryCode)?.name ?? code;
}
