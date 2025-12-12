interface ButtonParams {
    loading: boolean
    executeRequest: () => void
}

export function RequestButton({loading, executeRequest}: ButtonParams) {
    return (
        <button 
          onClick={executeRequest}
          disabled={loading}
          className="flex-none margin-small bg-blue-500 text-white px-4 py-2 rounded-lg
            shadow-md active:shadow-sm active:scale-95 active:bg-blue-600 
            transition-all duration-100"
        >
          Submit
        </button>
    )

}

