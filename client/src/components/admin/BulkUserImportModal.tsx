import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, X, CheckCircle, AlertCircle, Download, Users, UserPlus, Copy, Download as DownloadIcon, Shield } from 'lucide-react';
import { authAPI } from '../../lib/api';

interface BulkUserImportModalProps {
  onClose: () => void;
}

interface UserPreview {
  name: string;
  email: string;
  role: string;
  phone?: string;
  targetYear?: number;
  institutionCode?: string;
  password?: string;
  _index?: number;
}

export default function BulkUserImportModal({ onClose }: BulkUserImportModalProps) {
  const [activeTab, setActiveTab] = useState<'json' | 'csv'>('json');
  const [jsonData, setJsonData] = useState('');
  const [csvData, setCsvData] = useState('');
  const [preview, setPreview] = useState<UserPreview[]>([]);
  const [errors, setErrors] = useState<{ row: number; field: string; message: string }[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<UserPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (data: { users: any[] }) => authAPI.createBulkUsers(data),
    onSuccess: (response) => {
      const data = response.data?.data || response.data;
      setGeneratedCredentials(data.users || []);
      toast.success(`${data.created || 0} users created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (data.errors && data.errors.length > 0) {
        toast.error(`${data.errors.length} users failed to create`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import users');
    },
  });

  const validateAndPreview = useCallback(() => {
    const data = activeTab === 'json' ? jsonData : csvData;
    if (!data.trim()) {
      toast.error('Please enter data to import');
      return;
    }

    let users: UserPreview[] = [];
    const validationErrors: { row: number; field: string; message: string }[] = [];

    try {
      if (activeTab === 'json') {
        const parsed = JSON.parse(data);
        users = Array.isArray(parsed) ? parsed : parsed.users || [];
      } else {
        users = parseCSV(data);
      }

      if (users.length === 0) {
        toast.error('No users found in the data');
        return;
      }

      users.forEach((u, index) => {
        const row = index + 1;
        if (!u.name?.trim()) {
          validationErrors.push({ row, field: 'name', message: 'Missing user name' });
        }
        if (!u.email?.trim()) {
          validationErrors.push({ row, field: 'email', message: 'Missing email address' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) {
          validationErrors.push({ row, field: 'email', message: `Invalid email format: ${u.email}` });
        }
        if (u.role && !['student', 'institution_admin', 'super_admin'].includes(u.role)) {
          validationErrors.push({ row, field: 'role', message: `Invalid role: ${u.role}` });
        }
      });

      const validUsers = users.filter((_, idx) => 
        !validationErrors.some(e => e.row === idx + 1)
      );

      if (validUsers.length === 0) {
        toast.error('No valid users to import');
        return;
      }

      const usersWithIndex = validUsers.map((u, idx) => ({ ...u, role: u.role || 'student', _index: idx }));
      setPreview(usersWithIndex);
      setErrors(validationErrors);
      setIsPreviewMode(true);
    } catch (error) {
      toast.error('Invalid format. Please check your data.');
    }
  }, [activeTab, jsonData, csvData]);

  const parseCSV = (csv: string): UserPreview[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    const users: UserPreview[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseCSVLine(lines[i]);
      const u: UserPreview = { name: '', email: '', role: 'student' };
      
      headers.forEach((header, idx) => {
        const value = values[idx]?.trim().replace(/^"|"$/g, '') || '';
        if (header === 'name') u.name = value;
        else if (header === 'email') u.email = value;
        else if (header === 'role') u.role = value || 'student';
        else if (header === 'phone') u.phone = value;
        else if (header === 'targetyear' || header === 'target_year') u.targetYear = parseInt(value) || undefined;
        else if (header === 'institutioncode' || header === 'institution_code') u.institutionCode = value;
      });
      
      users.push(u);
    }
    return users;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (file.name.endsWith('.json')) {
        setActiveTab('json');
        setJsonData(content);
      } else if (file.name.endsWith('.csv')) {
        setActiveTab('csv');
        setCsvData(content);
      } else {
        toast.error('Please upload a JSON or CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const users = preview.map(({ _index, ...u }) => u);
    importMutation.mutate({ users });
  };

  const downloadTemplate = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const template = {
        description: "KEAM User Import Template",
        instructions: "Each object represents one user. role can be: student, institution_admin, super_admin",
        users: [
          { name: "John Doe", email: "john.doe@example.com", phone: "+91 9876543210", targetYear: 2026, role: "student" },
          { name: "Jane Smith", email: "jane.smith@example.com", role: "student" },
          { name: "Admin User", email: "admin@example.com", role: "institution_admin" }
        ]
      };
      
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      downloadBlob(blob, 'keam_users_template.json');
    } else {
      const template = `name,email,role,phone,targetYear,institutionCode
"John Doe","john.doe@example.com","student","+91 9876543210",2026,INST001
"Jane Smith","jane.smith@example.com","student","+91 9876543211",2026,INST001
"Admin User","admin@example.com","institution_admin","","",INST001`;
      
      const blob = new Blob([template], { type: 'text/csv' });
      downloadBlob(blob, 'keam_users_template.csv');
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyCredentials = (credentials: UserPreview[]) => {
    const text = credentials.map(c => `${c.name}: ${c.email} (${c.role}) - Password: ${c.password}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard!');
  };

  const downloadCredentials = (credentials: UserPreview[]) => {
    const csv = `Name,Email,Role,Password\n${credentials.map(c => `"${c.name}","${c.email}","${c.role}","${c.password}"`).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, 'user_credentials.csv');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1"><Shield className="w-3 h-3" />Super Admin</span>;
      case 'institution_admin':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">Admin</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Student</span>;
    }
  };

  const errorCount = errors.length;
  const validCount = preview.length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-800 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Bulk Import Users</h2>
                <p className="text-green-200 text-sm">Import students, admins, or super admins from JSON or CSV</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {generatedCredentials.length > 0 && (
          <div className="p-4 bg-green-50 border-b border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-green-800 font-semibold">Import Successful!</p>
                  <p className="text-green-600 text-sm">{generatedCredentials.length} users created. Download or copy their credentials below.</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyCredentials(generatedCredentials)}
                  className="flex items-center px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 text-sm font-medium"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy All
                </button>
                <button
                  onClick={() => downloadCredentials(generatedCredentials)}
                  className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  <DownloadIcon className="w-4 h-4 mr-1" />
                  Download CSV
                </button>
              </div>
            </div>
            <div className="mt-3 max-h-40 overflow-y-auto bg-white rounded-lg border border-green-200 p-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-green-700">
                    <th className="text-left py-1 px-2">Name</th>
                    <th className="text-left py-1 px-2">Email</th>
                    <th className="text-left py-1 px-2">Role</th>
                    <th className="text-left py-1 px-2">Password</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {generatedCredentials.map((c, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1 px-2">{c.name}</td>
                      <td className="py-1 px-2">{c.email}</td>
                      <td className="py-1 px-2">{getRoleBadge(c.role)}</td>
                      <td className="py-1 px-2 font-mono bg-gray-50 px-2 rounded">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isPreviewMode ? (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Format Tabs */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('json')}
                className={`flex items-center px-5 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'json'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="w-5 h-5 mr-2 text-sm font-bold">{'{}'}</span>
                JSON Format
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`flex items-center px-5 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'csv'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                CSV Format
              </button>
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-green-400 hover:bg-green-50/50 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,.csv"
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm">JSON or CSV files only</p>
              </div>
            </div>

            {/* Template Download */}
            <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-lg mr-3 mt-0.5">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 mb-1">Download Template</h3>
                  <p className="text-blue-700 text-sm mb-3">Get a pre-formatted template with example data</p>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => downloadTemplate('json')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                    >
                      Download JSON Template
                    </button>
                    <button
                      onClick={() => downloadTemplate('csv')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                    >
                      Download CSV Template
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mb-6 p-5 bg-gray-50 rounded-2xl">
              <h3 className="font-bold text-gray-900 mb-3">Fields</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <code className="bg-gray-200 px-1 rounded">name</code> - Full name (required)</li>
                <li>• <code className="bg-gray-200 px-1 rounded">email</code> - Valid email address (required)</li>
                <li>• <code className="bg-gray-200 px-1 rounded">role</code> - student, institution_admin, or super_admin (default: student)</li>
                <li>• <code className="bg-gray-200 px-1 rounded">phone</code> - Phone number (optional)</li>
                <li>• <code className="bg-gray-200 px-1 rounded">targetYear</code> - Target exam year for students (optional)</li>
                <li>• <code className="bg-gray-200 px-1 rounded">institutionCode</code> - Institution code (optional)</li>
              </ul>
              <p className="mt-3 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                <strong>Note:</strong> Passwords will be auto-generated for all users. Download the credentials file after import.
              </p>
            </div>

            {/* Text Area */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste your {activeTab.toUpperCase()} data here:
              </label>
              <textarea
                value={activeTab === 'json' ? jsonData : csvData}
                onChange={(e) => activeTab === 'json' ? setJsonData(e.target.value) : setCsvData(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm bg-gray-50"
                placeholder={activeTab === 'json' ? '[\n  {\n    "name": "John Doe",\n    "email": "john@example.com",\n    "role": "student"\n  }\n]' : 'name,email,role,phone,targetYear\n"John Doe","john@example.com","student","+91 9876543210",2026'}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={validateAndPreview}
                disabled={!jsonData.trim() && !csvData.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium disabled:opacity-50 flex items-center"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Preview & Import
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Summary */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="text-3xl font-bold text-blue-700">{preview.length}</div>
                <div className="text-blue-600 text-sm">Users to Import</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="text-3xl font-bold text-green-700">{validCount}</div>
                <div className="text-green-600 text-sm">Valid Users</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                <div className="text-3xl font-bold text-amber-700">{errorCount}</div>
                <div className="text-amber-600 text-sm">Validation Errors</div>
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <h4 className="font-bold text-red-800">Validation Errors</h4>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {errors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="text-sm text-red-700 flex items-start">
                      <span className="font-mono bg-red-100 px-1.5 rounded mr-2 text-xs">Row {error.row}</span>
                      <span>{error.message}</span>
                    </div>
                  ))}
                  {errors.length > 10 && (
                    <div className="text-sm text-red-600 italic">
                      ...and {errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-3">User Preview</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((u, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                        <td className="px-4 py-3 text-sm">{getRoleBadge(u.role)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.targetYear || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium">Important</p>
                  <p className="text-amber-700 text-sm mt-1">
                    Passwords will be auto-generated for all users. 
                    Make sure to download the credentials after import.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button
                onClick={() => { setIsPreviewMode(false); setGeneratedCredentials([]); }}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
              >
                Back to Edit
              </button>
              <button
                onClick={handleImport}
                disabled={preview.length === 0 || importMutation.isPending}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 font-semibold transition-all shadow-md flex items-center"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                {importMutation.isPending ? 'Importing...' : `Import ${preview.length} Users`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
