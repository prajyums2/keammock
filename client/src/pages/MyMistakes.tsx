import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookmarkAPI } from '../lib/api';
import { Bookmark, ChevronDown, ChevronUp, XCircle, CheckCircle, Tag, Trash2 } from 'lucide-react';
import LaTeXRenderer from '../components/common/LaTeXRenderer';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface BookmarkItem {
  _id: string;
  questionId: any;
  examId: any;
  isCorrect: boolean;
  notes?: string;
  tags?: string[];
  createdAt: string;
}

export default function MyMistakes() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('all');

  const { data: bookmarks, isLoading } = useQuery({
    queryKey: ['my-mistakes'],
    queryFn: () => bookmarkAPI.getMyMistakes(),
    staleTime: 1000 * 60 * 5,
  });

  const bookmarkList: BookmarkItem[] = bookmarks?.data?.data?.bookmarks || bookmarks?.data?.bookmarks || [];
  const filteredList = subjectFilter === 'all' ? bookmarkList : bookmarkList.filter(b => b.questionId?.subject === subjectFilter);
  const subjects = ['all', ...new Set(bookmarkList.map(b => b.questionId?.subject).filter(Boolean))];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => bookmarkAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-mistakes'] }); toast.success('Updated'); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bookmarkAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-mistakes'] }); toast.success('Removed'); },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Mistakes</h1>
        <p className="mt-2 text-gray-600">Review questions you answered incorrectly. Learn from your mistakes.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <Bookmark className="w-5 h-5 text-red-600" />
          <span className="font-semibold">{bookmarkList.length} total mistakes</span>
          <div className="flex gap-2 ml-auto">
            {subjects.map(s => (
              <button key={s} onClick={() => setSubjectFilter(s)} className={`px-3 py-1 rounded-full text-sm font-medium ${subjectFilter === s ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No mistakes yet!</h3>
          <p className="text-gray-600">Keep taking tests. Your incorrect answers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map(bm => (
            <div key={bm._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-gray-500">{bm.examId?.title}</span>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">{bm.questionId?.section}</span>
                    </div>
                    <p className="text-gray-900 mb-3"><LaTeXRenderer>{bm.questionId?.questionText}</LaTeXRenderer></p>
                    {bm.questionId?.options && (
                      <div className="space-y-1">
                        {bm.questionId.options.map((opt: any, i: number) => (
                          <div key={i} className={`text-sm px-3 py-1.5 rounded ${opt.isCorrect ? 'bg-green-100 text-green-800 font-medium' : bm.userAnswer === opt.text ? 'bg-red-100 text-red-800 line-through' : 'text-gray-600'}`}>
                            {String.fromCharCode(65 + i)}. <LaTeXRenderer>{opt.text}</LaTeXRenderer> {opt.isCorrect ? '✓' : bm.userAnswer === opt.text ? '✗' : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteMutation.mutate(bm._id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>

                {bm.notes && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800"><Tag className="w-4 h-4 inline mr-1" />{bm.notes}</p>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setExpandedId(expandedId === bm._id ? null : bm._id); }} className="text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1">
                    {expandedId === bm._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {expandedId === bm._id ? 'Hide' : 'Add Notes'}
                  </button>
                </div>

                {expandedId === bm._id && (
                  <div className="mt-3 flex gap-2">
                    <input value={editingId === bm._id ? editNotes : (bm.notes || '')} onChange={e => { setEditingId(bm._id); setEditNotes(e.target.value); }} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-700" placeholder="Add a note about this question..." />
                    <button onClick={() => updateMutation.mutate({ id: bm._id, data: { notes: editNotes } })} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800">Save</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
