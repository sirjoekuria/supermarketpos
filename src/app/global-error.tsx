'use client';
 
import { useEffect } from 'react';
import { sendCriticalAlert } from '@/lib/alerts';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to our alert webhook when a fatal crash happens
    sendCriticalAlert(error, { type: 'global_client_crash', digest: error.digest });
  }, [error]);
 
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-4 border border-red-100 dark:border-red-900/50">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Error</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A critical error occurred and the technical team has been notified. We apologize for the inconvenience.
            </p>
            <button
              onClick={() => reset()}
              className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
