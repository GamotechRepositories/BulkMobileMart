import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getAddresses, addAddress, updateAddress, deleteAddress } from "../api/api";
import AddressForm, { ADDRESS_FORM_FIELDS } from "../components/address/AddressForm";

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-base text-text-primary">{value}</p>
    </div>
  );
}

function formatAddressLine(addr) {
  return [addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");
}

function Profile() {
  const { user, openAuthModal } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [formError, setFormError] = useState("");

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const { data } = await getAddresses();
      setAddresses(data.data || []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAddresses();
    } else {
      setAddresses([]);
      setLoading(false);
    }
  }, [user]);

  const handleSaveAddress = async (formData) => {
    setSavingAddress(true);
    setFormError("");
    try {
      if (editingAddress) {
        const { data } = await updateAddress(editingAddress._id, formData);
        setAddresses((prev) =>
          prev.map((addr) => (addr._id === editingAddress._id ? data.data : addr))
        );
      } else {
        const { data } = await addAddress({
          ...formData,
          isDefault: addresses.length === 0,
        });
        setAddresses((prev) => [data.data, ...prev]);
      }
      setShowAddressForm(false);
      setEditingAddress(null);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleEditAddress = (addr) => {
    setEditingAddress(addr);
    setShowAddressForm(true);
    setFormError("");
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      await deleteAddress(addrId);
      setAddresses((prev) => prev.filter((addr) => addr._id !== addrId));
    } catch {
      setFormError("Failed to delete address");
    }
  };

  const cancelAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setFormError("");
  };

  return (
    <div className="min-h-screen bg-mobile-bg px-4 pb-24 pt-4 sm:px-6 lg:pb-10 lg:pt-10">
      <div className="mx-auto max-w-xl lg:mt-0">
        <h1 className="mb-8 text-center text-2xl font-bold text-text-primary sm:text-3xl">
          Profile
        </h1>

        {!user ? (
          <div className="rounded-lg border border-border-light bg-white px-6 py-10 text-center sm:px-10">
            <p className="mb-6 text-sm text-text-secondary">
              Sign in to manage your account and addresses.
            </p>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="rounded-lg bg-primary px-8 py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
              Login / Sign Up
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-border-light bg-white px-6 py-8 sm:px-10 sm:py-10">
            <div className="space-y-6">
              <InfoField label="Name" value={user.name} />
              <InfoField label="Email" value={user.email} />
              <InfoField
                label="Phone Number"
                value={user.phone ? user.phone : "Not provided"}
              />
            </div>

            <hr className="my-8 border-border-light" />

            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-text-primary">Saved Addresses</h2>
              {!showAddressForm && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(null);
                    setShowAddressForm(true);
                    setFormError("");
                  }}
                  className="text-sm font-medium text-primary transition hover:underline"
                >
                  + Add Address
                </button>
              )}
            </div>

            {formError && !showAddressForm && (
              <p className="mb-4 text-sm text-red-600">{formError}</p>
            )}

            {showAddressForm ? (
              <div>
                {formError && (
                  <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {formError}
                  </p>
                )}
                <AddressForm
                  initial={
                      editingAddress
                        ? {
                            name: editingAddress.name || "",
                            number: editingAddress.number || "",
                            landmark: editingAddress.landmark || "",
                            city: editingAddress.city || "",
                            state: editingAddress.state || "",
                            pincode: editingAddress.pincode || "",
                          }
                        : {
                            ...ADDRESS_FORM_FIELDS,
                            name: user.name || "",
                            number: user.phone || "",
                          }
                  }
                  onSubmit={handleSaveAddress}
                  onCancel={cancelAddressForm}
                  submitting={savingAddress}
                />
              </div>
            ) : loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg border border-border-light bg-gray-50" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <p className="text-sm text-text-secondary">No saved addresses yet.</p>
            ) : (
              <ul className="space-y-4">
                {addresses.map((addr) => (
                  <li
                    key={addr._id}
                    className="rounded-lg border border-gray-200 px-5 py-4"
                  >
                    <p className="text-base font-semibold text-text-primary">
                      {addr.name}
                      {addr.isDefault && (
                        <span className="ml-2 inline-block rounded border border-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {formatAddressLine(addr)}
                    </p>
                          <p className="mt-1 text-sm text-text-secondary">{addr.number}</p>
                    <div className="mt-3 flex gap-4">
                      <button
                        type="button"
                        onClick={() => handleEditAddress(addr)}
                        className="text-xs font-medium text-text-secondary transition hover:text-primary"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="text-xs font-medium text-text-secondary transition hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
