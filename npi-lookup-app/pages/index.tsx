import { useState } from 'react';
import Head from 'next/head';

interface NpiResult {
  npi: string;
  name: string;
  specialty: string;
  license: string;
  phone: string;
  fax: string;
  address: string;
  error?: string;
}

export default function Home() {
  const [npiInputs, setNpiInputs] = useState<string[]>(['']);
  const [results, setResults] = useState<NpiResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputErrors, setInputErrors] = useState<{[key: number]: string}>({});

  const addNpiField = () => {
    setNpiInputs([...npiInputs, '']);
    // Clear any input errors when adding a new field
    setInputErrors({});
  };

  const removeNpiField = (index: number) => {
    if (npiInputs.length > 1) {
      const newInputs = [...npiInputs];
      newInputs.splice(index, 1);
      setNpiInputs(newInputs);
      
      // Remove any error for this input
      const newErrors = {...inputErrors};
      delete newErrors[index];
      setInputErrors(newErrors);
    }
  };

  const updateNpiValue = (index: number, value: string) => {
    const newInputs = [...npiInputs];
    // Only allow numeric input with max length of 10
    if (value === '' || (/^\d+$/.test(value) && value.length <= 10)) {
      newInputs[index] = value;
      setNpiInputs(newInputs);
      
      // Clear error for this input if it exists
      if (inputErrors[index]) {
        const newErrors = {...inputErrors};
        delete newErrors[index];
        setInputErrors(newErrors);
      }
    }
  };

  const validateInputs = () => {
    const newErrors: {[key: number]: string} = {};
    let hasErrors = false;
    
    npiInputs.forEach((npi, index) => {
      if (npi.trim() === '') {
        // Skip empty fields, they'll be filtered out later
        return;
      }
      
      if (npi.length !== 10) {
        newErrors[index] = 'NPI must be 10 digits';
        hasErrors = true;
      }
    });
    
    setInputErrors(newErrors);
    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // First validate the inputs
    if (!validateInputs()) {
      return;
    }
    
    // Filter out empty inputs
    const validNpis = npiInputs.filter(npi => npi.trim() !== '');
    
    if (validNpis.length === 0) {
      setError('Please enter at least one NPI number');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const npiParam = validNpis.join(',');
      const response = await fetch(`/api/fetchNpi?npi=${encodeURIComponent(npiParam)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setResults([]);
      } else if (Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        setError('Invalid response format from server');
        setResults([]);
      }
    } catch (err) {
      setError('Failed to fetch NPI data. Please try again.');
      console.error(err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setNpiInputs(['']);
    setResults([]);
    setError('');
    setInputErrors({});
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>NPI Lookup Tool</title>
        <meta name="description" content="Look up healthcare provider information by NPI number" />
      </Head>

      <main className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-800">NPI Lookup Tool</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NPI Number(s)
              </label>
              
              {npiInputs.map((npi, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={npi}
                      onChange={(e) => updateNpiValue(index, e.target.value)}
                      placeholder="Enter 10-digit NPI number"
                      className={`flex-1 border ${inputErrors[index] ? 'border-red-500' : 'border-gray-300'} rounded-md px-4 py-2 focus:ring-blue-500 focus:border-blue-500`}
                      aria-invalid={!!inputErrors[index]}
                    />
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeNpiField(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                        aria-label="Remove NPI field"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {inputErrors[index] && (
                    <p className="text-red-500 text-sm">{inputErrors[index]}</p>
                  )}
                </div>
              ))}
              
              <div className="flex justify-between items-center mt-4">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={addNpiField}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Add Another NPI
                  </button>
                  
                  {(npiInputs.length > 1 || results.length > 0) && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="flex items-center text-gray-600 hover:text-gray-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Clear All
                    </button>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </div>
                  ) : 'Lookup'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NPI</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialty</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index} className={result.error ? "bg-red-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.npi}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.error ? <span className="text-red-500">{result.error}</span> : result.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.specialty}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.license}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {!result.error && (
                          <>
                            <div>Phone: {result.phone}</div>
                            <div>Fax: {result.fax}</div>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{result.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 