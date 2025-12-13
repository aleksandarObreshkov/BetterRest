import styles from "./UrlInput.module.css"

interface UrlInputProps {
  url: string;
  setUrl: (url: string) => void;
  loading: boolean;
}


export default function UrlInput({url, setUrl, loading}: UrlInputProps) {
        
    return (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className={`${styles.urlInputBase} ${
            loading 
              ? styles.urlInputLoading
              : styles.urlInputNotLoading
          }`}
        />
    )
}