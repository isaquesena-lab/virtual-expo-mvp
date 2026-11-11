import { useMemo } from "react";
import { COUNTRY_CODES, countryName } from "../../shared/countries";

/**
 * Country picker. A native <select> on purpose: with ~250 entries, type-ahead and the
 * mobile wheel picker beat any custom list. Labels are localised by the browser.
 */
export function CountrySelect({
  name,
  defaultValue,
  className,
}: {
  name: string;
  defaultValue?: string | null;
  className?: string;
}) {
  const options = useMemo(() => {
    const locale = typeof navigator !== "undefined" ? navigator.language : undefined;
    return COUNTRY_CODES.map((code) => ({ code, label: countryName(code, locale) })).sort((a, b) =>
      a.label.localeCompare(b.label, locale),
    );
  }, []);
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={className}>
      <option value="">Select a country</option>
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
