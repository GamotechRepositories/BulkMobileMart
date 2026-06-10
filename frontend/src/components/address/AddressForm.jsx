import { useState } from "react";

export const ADDRESS_FORM_FIELDS = {
  name: "",
  number: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
};

const PHONE_PATTERN = /^[6789]\d{9}$/;
const PINCODE_PATTERN = /^\d{6}$/;

export function validateAddressForm(form) {
  const name = form.name?.trim();
  const number = form.number?.trim();
  const city = form.city?.trim();
  const state = form.state?.trim();
  const pincode = form.pincode?.trim();

  if (!name) return "Name is required";
  if (!number) return "Phone number is required";
  if (!PHONE_PATTERN.test(number)) {
    return "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9";
  }
  if (!city) return "City is required";
  if (!state) return "State is required";
  if (!pincode) return "Pincode is required";
  if (!PINCODE_PATTERN.test(pincode)) return "Pincode must be 6 digits";
  return "";
}

const inputClass =
  "w-full rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-primary";

function AddressForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(initial || ADDRESS_FORM_FIELDS);
  const [validationError, setValidationError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (validationError) setValidationError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const error = validateAddressForm(form);
    if (error) {
      setValidationError(error);
      return;
    }

    onSubmit({
      name: form.name.trim(),
      number: form.number.trim(),
      landmark: form.landmark.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border-light bg-white p-4"
    >
      {validationError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{validationError}</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Name"
            className={inputClass}
          />
        </div>
        <div className="col-span-1">
          <input
            name="number"
            value={form.number}
            onChange={handleChange}
            required
            maxLength={10}
            pattern="[6789][0-9]{9}"
            placeholder="10-digit mobile"
            inputMode="numeric"
            className={inputClass}
          />
        </div>
      </div>

      <input
        name="landmark"
        value={form.landmark}
        onChange={handleChange}
        placeholder="Landmark / Street area"
        className={inputClass}
      />

      <div className="grid grid-cols-3 gap-3">
        <input
          name="city"
          value={form.city}
          onChange={handleChange}
          required
          placeholder="City"
          className={inputClass}
        />
        <input
          name="state"
          value={form.state}
          onChange={handleChange}
          required
          placeholder="State"
          className={inputClass}
        />
        <input
          name="pincode"
          value={form.pincode}
          onChange={handleChange}
          required
          maxLength={6}
          pattern="\d{6}"
          placeholder="Pincode"
          inputMode="numeric"
          className={inputClass}
        />
      </div>

      <div className="flex items-center justify-end gap-4 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-text-secondary transition hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Address"}
        </button>
      </div>
    </form>
  );
}

export default AddressForm;
