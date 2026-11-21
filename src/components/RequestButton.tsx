import styles from "./RequestButton.module.css";
interface ButtonParams {
    loading: boolean
    executeRequest: () => void
    cancelRequest: () => void
}

export function RequestButton({loading, executeRequest, cancelRequest}: ButtonParams) {
    return (
        <button 
          onClick={loading ? cancelRequest : executeRequest}
          className={`${styles.submitButton}`}
        >
          {loading ? 'Cancel' : 'Send'}
        </button>
    )

}
