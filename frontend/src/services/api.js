const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api'

export async function api(path, options = {}) {
  const token = localStorage.getItem('unnati_token') || localStorage.getItem('shgms-token')
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed')
    error.status = response.status
    throw error
  }
  return data
}