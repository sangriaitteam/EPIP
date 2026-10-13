import { IdCard } from 'lucide-react'

const GenerateIDCardPage = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IdCard size={22} className="text-primary-500" />
          Generate ID Card
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Generate employee ID cards</p>
      </div>
    </div>
  )
}

export default GenerateIDCardPage
