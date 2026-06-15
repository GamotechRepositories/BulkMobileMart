import { inputClass, labelClass } from "./adminStyles";

const EMPTY_COLOR = { name: "" };

function ColorOptionsField({ colors = [], onChange }) {
  const updateColor = (index, field, value) => {
    onChange(
      colors.map((color, i) => (i === index ? { ...color, [field]: value } : color))
    );
  };

  const addColor = () => {
    onChange([...colors, { ...EMPTY_COLOR }]);
  };

  const removeColor = (index) => {
    onChange(colors.length === 1 ? [{ ...EMPTY_COLOR }] : colors.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className={labelClass}>Available colors</label>
      <p className="mb-2 text-xs text-text-muted">
        Optional. Add color names for customers to choose from.
      </p>
      <div className="space-y-2">
        {colors.map((color, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-border-light p-3 sm:grid-cols-[1fr_auto]"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Color name
              </label>
              <input
                type="text"
                placeholder="e.g. Midnight Black"
                value={color.name}
                onChange={(e) => updateColor(index, "name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeColor(index)}
                className="w-full rounded-lg border border-border-light px-3 py-2.5 text-sm text-red-600 transition hover:border-red-300 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addColor}
        className="mt-2 text-sm font-semibold text-accent hover:underline"
      >
        + Add color
      </button>
    </div>
  );
}

export { EMPTY_COLOR };

export default ColorOptionsField;
