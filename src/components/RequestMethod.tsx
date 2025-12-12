const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]; 

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function RequestMethod({ value, onChange }: Props) {
  return (
    <select
      className="border rounded px-2 py-1 bg-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {methods.map((method) => (
        <option key={method} value={method}>
          {method}
        </option>
      ))}
    </select>
  );
}
