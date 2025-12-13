import styles from "./RequestButton.module.css";
interface ButtonParams {
    loading: boolean
    executeRequest: () => void
}

export function RequestButton({loading, executeRequest}: ButtonParams) {
    return (
        <button 
          onClick={executeRequest}
          disabled={loading}
          className={`${styles.submitButton}`}
        >
          Submit
        </button>
    )

}

