import styles from './RequestMethod.module.css';

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]; 

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function RequestMethod({ value, onChange }: Props) {
  return (
    <select
      className={`${styles.requestMethod}`}
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
