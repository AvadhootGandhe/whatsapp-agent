import { useState } from "react";
import "./PhoneInput.css";

const COUNTRY_CODES = [
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+1", country: "US", flag: "🇺🇸" },
  { code: "+44", country: "GB", flag: "🇬🇧" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+971", country: "AE", flag: "🇦🇪" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
];

export default function PhoneInput({ value, onChange, disabled }) {
  const [countryCode, setCountryCode] = useState("+91");

  const handlePhoneChange = (e) => {
    const phone = e.target.value.replace(/\D/g, "");
    // Combine country code (strip +) with phone
    onChange(countryCode.replace("+", "") + phone);
  };

  return (
    <div className="phone-input-wrapper">
      <select
        className="phone-country-select input"
        value={countryCode}
        onChange={(e) => {
          setCountryCode(e.target.value);
          // Re-compute with new code if there's existing input
        }}
        disabled={disabled}
        id="phone-country-code"
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>
      <input
        type="tel"
        className="phone-number-input input"
        placeholder="9876543210"
        onChange={handlePhoneChange}
        disabled={disabled}
        maxLength={12}
        id="phone-number-input"
      />
    </div>
  );
}
