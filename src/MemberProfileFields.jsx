import { MEMBER_COLORS, MEMBER_COLOR_LABELS, memberColorInk, isMemberColor, memberTileStyle } from "./lib/memberColors.js";

const FAMILY_TYPES = ["Child", "Parent", "Adult", "Teen", "Toddler", "Baby", "Mother", "Father", "Daughter", "Son", "Sibling", "Sister", "Brother", "Grandparent", "Grandmother", "Grandfather", "Grandchild", "Step-parent", "Stepchild", "Half-sibling", "Guardian", "Foster parent", "Foster child", "Spouse", "Partner", "Aunt", "Uncle", "Cousin", "Niece", "Nephew", "In-law", "Caregiver", "Household member", "Pet", "Other family member"];

export function FamilyTypeField({ value = "", onChange, disabled }) {
  value = typeof value === "string" ? value : "";
  const custom = value && !FAMILY_TYPES.includes(value);
  return <fieldset className="profile-field-group"><legend>Family member type</legend>
    <label>Relationship<select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
      <option value="">Choose…</option>{FAMILY_TYPES.map(type => <option key={type}>{type}</option>)}
      {custom && <option value={value}>{value}</option>}
    </select></label>
    <label>Custom relationship (optional)<input type="text" value={custom ? value : ""} maxLength={80} disabled={disabled} placeholder="e.g. Great-grandparent" onChange={e => onChange(e.target.value || "Other family member")} /></label>
  </fieldset>;
}

export function ThemeColorField({ value = "", onChange, disabled, dark = true }) {
  value = typeof value === "string" ? value : "";
  const custom = value.startsWith("#");
  const hex = isMemberColor(value) ? memberTileStyle(value)["--member-color"] : "#4bc88b";
  return <fieldset className="profile-field-group"><legend>Theme color</legend>
    <label>Preset color<select disabled={disabled} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Choose automatically</option>{Object.keys(MEMBER_COLORS).map(key => <option key={key} value={key}>{MEMBER_COLOR_LABELS[key] || key}</option>)}
      {custom && <option value={value}>Custom ({value})</option>}
    </select></label>
    <div className="profile-custom-color"><label>Custom color<input type="color" value={hex} disabled={disabled} onChange={e => onChange(e.target.value)} /></label>
      <label>Hex color<input type="text" value={custom ? value : hex} required pattern="#[0-9a-fA-F]{6}" maxLength={7} spellCheck={false} autoComplete="off" disabled={disabled} onChange={e => onChange(e.target.value)} /></label>
      <span className="profile-color-preview" style={{ background: hex, color: memberColorInk(hex) }} aria-label={`Color preview ${hex}`}>Aa</span>
    </div><p className="footnote">Choose a preset or any custom color. Calendar events use the same color.</p>
  </fieldset>;
}
