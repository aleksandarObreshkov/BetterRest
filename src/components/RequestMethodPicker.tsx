import { useState, useRef, useEffect } from 'react';
import styles from './RequestMethod.module.css'
import { HttpMethodHelpers } from '../models/HttpMethod';

type Props = {
  value: string;
  onChange: (v: string) => void;
};

const httpMethods = HttpMethodHelpers.getAllValues()

export default function RequestMethodPicker({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (method: string) => {
    onChange(method);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`${styles.requestMethodRoot}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{value}</span>
        <span className="ml-2">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={`${styles.requestMethodChoice}`}>
          {httpMethods.map((method, index) => (
            <div
              key={method}
              className={`px-2 py-1 cursor-pointer hover:bg-blue-100 ${
                HttpMethodHelpers.stringEquals(method, value) ? 'bg-blue-200' : 'bg-white'
              } ${index === httpMethods.length - 1 ? 'rounded-b-lg' : ''}`}
              onClick={() => handleSelect(method)}
            >
              {method}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}