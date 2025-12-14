interface ResponseProps {
    response: string
}

export default function ResponseView({response}: ResponseProps) {
    return (
    <p className="flex flex-2 h-full w-full mt-4 p-4 bg-gray-100 rounded">
        {response || 'No response yet'}
      </p>
    )
}