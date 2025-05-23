import { login, signup } from './actions'

export default function LoginPage() {
  return (
<div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form className="bg-white shadow-md rounded-lg p-8 w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center text-gray-800">Startup Miner</h1>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input id="email" name="email" type="email" required
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input id="password" name="password" type="password" required
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button formAction={login} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded transition">
          Log in
        </button>
        <button formAction={signup} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition">
          Sign up
        </button>
      </form>
    </div>
  )
}