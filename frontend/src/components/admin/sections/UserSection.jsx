import { useEffect, useState } from "react";
import { deleteUser, getUsers, updateUser } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import UserEditModal from "../UserEditModal";
import { btnDanger, btnSecondary, tableClass } from "../adminStyles";

function UserSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getUsers();
      setUsers(data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load users. Login as admin to view registered dealers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (id, payload) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await updateUser(id, payload);
      setSuccess("User updated successfully");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      setError("");
      setSuccess("");
      await deleteUser(id);
      setSuccess("User deleted");
      if (editingUser?._id === id) setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
    }
  };

  return (
    <div>
      <AdminAlert
        error={error}
        success={success}
        onClear={() => {
          setError("");
          setSuccess("");
        }}
      />

      <div className="mb-4">
        <p className="text-sm text-text-secondary">
          All users ({users.length})
        </p>
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-text-secondary">
          {error ? "Could not load users." : "No registered users yet."}
        </p>
      ) : (
        <div className={tableClass}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-light bg-mobile-surface">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user._id}
                  className="border-b border-border-light last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                  <td className="px-4 py-3 text-text-secondary">{user.phone}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className={btnSecondary}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user._id)}
                        className={btnDanger}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserEditModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

export default UserSection;
