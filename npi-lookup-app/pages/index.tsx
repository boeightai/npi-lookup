import { useState } from 'react';
import Head from 'next/head';

interface NpiResult {
  npi: string;
  name: string;
  entityType: string;
  sex: string;
  specialty: string;
  license: string;
  licenseState: string;
  phone: string;
  fax: string;
  address: string;
  lastUpdated: string;
  error?: string;
}

const NpiInput = ({ 
  value, 
  onChange, 
  onRemove, 
  error, 
  showRemoveButton 
}: { 
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  error?: string;
  showRemoveButton: boolean;
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter 10-digit NPI number"
        className={`w-64 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md px-4 py-2 focus:ring-blue-500 focus:border-blue-500`}
        aria-invalid={!!error}
      />
      {showRemoveButton && (
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-red-500 hover:text-red-700"
          aria-label="Remove NPI field"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

const ResultCard = ({ result }: { result: NpiResult }) => {
  if (result.error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border-red-200 border">
        <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
        <p className="text-red-500">{result.error}</p>
        <p className="text-sm text-gray-600 mt-2">NPI: {result.npi}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-gray-800 mb-3">{result.name}</h2>
      
      <div className="space-y-2">
        <div className="text-sm">
          <span className="font-medium">NPI:</span> {result.npi}
        </div>
        
        <div className="text-sm">
          <span className="font-medium">Entity Type:</span> {result.entityType}
        </div>
        
        {result.entityType === 'Individual' && (
          <div className="text-sm">
            <span className="font-medium">Sex:</span> {result.sex}
          </div>
        )}
        
        <div className="text-sm">
          <span className="font-medium">Specialty:</span> {result.specialty}
        </div>
        
        <div className="text-sm">
          <span className="font-medium">License:</span> {result.license}
        </div>
        
        {result.licenseState !== 'N/A' && (
          <div className="text-sm">
            <span className="font-medium">License State:</span> {result.licenseState}
          </div>
        )}
        
        <div className="text-sm">
          <span className="font-medium">Phone:</span> {result.phone}
        </div>
        
        {result.fax !== 'N/A' && (
          <div className="text-sm">
            <span className="font-medium">Fax:</span> {result.fax}
          </div>
        )}
        
        <div className="text-sm">
          <span className="font-medium">Address:</span> {result.address}
        </div>
        
        <div className="text-sm">
          <span className="font-medium">Last Updated:</span> {result.lastUpdated}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [npiInputs, setNpiInputs] = useState<string[]>(['']);
  const [results, setResults] = useState<NpiResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputErrors, setInputErrors] = useState<{[key: number]: string}>({});

  const addNpiField = () => {
    setNpiInputs([...npiInputs, '']);
    setInputErrors({});
  };

  const removeNpiField = (index: number) => {
    if (npiInputs.length > 1) {
      const newInputs = [...npiInputs];
      newInputs.splice(index, 1);
      setNpiInputs(newInputs);
      
      const newErrors = {...inputErrors};
      delete newErrors[index];
      setInputErrors(newErrors);
    }
  };

  const updateNpiValue = (index: number, value: string) => {
    if (value === '' || (/^\d+$/.test(value) && value.length <= 10)) {
      const newInputs = [...npiInputs];
      newInputs[index] = value;
      setNpiInputs(newInputs);
      
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
    
    if (!validateInputs()) {
      return;
    }
    
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
    <div className="min-h-screen bg-gray-100 py-8">
      <Head>
        <title>NPI Lookup Tool | Healthcare Provider Identification</title>
        <meta name="description" content="Lookup healthcare provider information quickly using NPI numbers to access details about physicians, nurses, and healthcare organizations." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keywords" content="NPI, healthcare provider, doctor lookup, medical professional database, national provider identifier" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-extrabold text-center mb-10 text-blue-900">NPI Lookup Tool</h1>
        
        <div className="bg-white p-8 rounded-lg shadow-lg mb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="block text-lg font-medium text-gray-800 mb-2">
                NPI Number(s)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Enter a 10-digit NPI number to look up provider information.<br />
                Example NPI numbers: 1417005489, 1306849806, 1437108511
              </p>
              
              {npiInputs.map((npi, index) => (
                <NpiInput
                  key={index}
                  value={npi}
                  onChange={(value) => updateNpiValue(index, value)}
                  onRemove={() => removeNpiField(index)}
                  error={inputErrors[index]}
                  showRemoveButton={index > 0}
                />
              ))}
              
              <div className="flex justify-between items-center mt-6">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={addNpiField}
                    className="flex items-center text-blue-700 hover:text-blue-900"
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
                      className="flex items-center text-gray-700 hover:text-gray-900"
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
                  className="bg-blue-700 text-white px-6 py-3 rounded-md hover:bg-blue-800 disabled:bg-blue-500"
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
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-10">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {results.map((result, index) => (
                <ResultCard key={index} result={result} />
              ))}
            </div>
            
            <div className="flex justify-center mb-10">
              <button
                onClick={clearAll}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300"
              >
                New Search
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 