import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { examAPI } from '../../lib/api';
import { 
  Layout, Type, Clock, Award, AlertCircle, CheckCircle, 
  Eye, EyeOff, Shuffle, Calendar, X, Plus, Trash2,
  GripVertical, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import type { Exam } from '../../types';

interface VisualTestEditorProps {
  exam: Exam;
  onClose: () => void;
}

export default function VisualTestEditor({ exam, onClose }: VisualTestEditorProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'basic' | 'sections' | 'timing' | 'security'>('basic');
  const [formData, setFormData] = useState({
    title: exam.title,
    description: exam.description,
    instructions: exam.instructions,
    duration: exam.duration,
    totalMarks: exam.totalMarks,
    passingMarks: exam.passingMarks,
    negativeMarking: exam.negativeMarking,
    negativeMarksPerWrong: exam.negativeMarksPerWrong,
    allowShuffle: exam.allowShuffle,
    isActive: exam.isActive,
    startDate: exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 16) : '',
    endDate: exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 16) : '',
    sections: exam.sections || [],
  });

  const updateMutation = useMutation({
    mutationFn: () => examAPI.update(exam._id, formData),
    onSuccess: () => {
      toast.success('Test updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update test');
    },
  });

  const addSection = () => {
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, { name: '', marksPerQuestion: 1, questions: [] }]
    }));
  };

  const removeSection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const updateSection = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      )
    }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formData.sections.length - 1) return;
    
    const newSections = [...formData.sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    
    setFormData(prev => ({ ...prev, sections: newSections }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <Layout className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Visual Test Editor</h2>
              <p className="text-blue-100 text-sm">{exam.code} - {exam.subject}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {[
            { id: 'basic', label: 'Basic Info', icon: Type },
            { id: 'sections', label: 'Sections', icon: Layout },
            { id: 'timing', label: 'Timing', icon: Clock },
            { id: 'security', label: 'Security', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (mins) *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Marks *
                  </label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={formData.totalMarks}
                      onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    value={formData.passingMarks}
                    onChange={(e) => setFormData({ ...formData, passingMarks: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions for Students
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            </div>
          )}

          {activeTab === 'sections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Test Sections</h3>
                <button
                  onClick={addSection}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </button>
              </div>

              <div className="space-y-3">
                {formData.sections.map((section, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold text-gray-700">Section {index + 1}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === formData.sections.length - 1}
                          className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSection(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Section Name</label>
                        <input
                          type="text"
                          value={section.name}
                          onChange={(e) => updateSection(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., General Aptitude"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Marks per Question</label>
                        <input
                          type="number"
                          value={section.marksPerQuestion}
                          onChange={(e) => updateSection(index, 'marksPerQuestion', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Questions: {section.questions?.length || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timing' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Test Availability Schedule</h3>
                <p className="text-sm text-blue-700">
                  Set when students can access this test. Leave blank for always available.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2">Time Settings</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Students must complete the test within {formData.duration} minutes</li>
                  <li>• Timer starts when student clicks &quot;Start Test&quot;</li>
                  <li>• Test auto-submits when time expires</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.negativeMarking}
                    onChange={(e) => setFormData({ ...formData, negativeMarking: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Enable Negative Marking</span>
                    <p className="text-sm text-gray-500">Deduct marks for wrong answers</p>
                  </div>
                </label>

                {formData.negativeMarking && (
                  <div className="ml-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Negative Marks per Wrong Answer
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.negativeMarksPerWrong}
                      onChange={(e) => setFormData({ ...formData, negativeMarksPerWrong: parseFloat(e.target.value) })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.allowShuffle}
                    onChange={(e) => setFormData({ ...formData, allowShuffle: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <Shuffle className="w-4 h-4 mr-2 text-gray-600" />
                      <span className="font-medium text-gray-900">Shuffle Questions & Options</span>
                    </div>
                    <p className="text-sm text-gray-500">Randomize question order and answer options for each student</p>
                  </div>
                </label>

                <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-gray-900">Make Test Active</span>
                    <p className="text-sm text-gray-500">Students can see and take this test</p>
                  </div>
                </label>
              </div>

              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Security Features Active
                </h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Anti-cheating protection enabled</li>
                  <li>• Tab switching detection</li>
                  <li>• Fullscreen enforcement</li>
                  <li>• Copy-paste disabled</li>
                  <li>• Automatic submission on violations</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
