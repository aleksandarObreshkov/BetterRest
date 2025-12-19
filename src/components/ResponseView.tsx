import styles from './ResponseView.module.css'

interface ResponseProps {
    response: string
}

export default function ResponseView({response}: ResponseProps) {
    return (
    <div className={`${styles.response}`}>
        {response || 'No response yet'}
      </div>
    )
}