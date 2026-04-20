/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Calculator, Clock, LayoutList, UploadCloud, Loader2, Euro, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LineItem {
  id: string;
  name: string;
  rate: string;
  hours: string;
  isHidden?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function App() {
  const [items, setItems] = useState<LineItem[]>([
    { id: generateId(), name: 'Frontend Development', rate: '120', hours: '40' },
    { id: generateId(), name: 'Backend Development', rate: '140', hours: '25' },
    { id: generateId(), name: 'UI/UX Design', rate: '95', hours: '15' },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLineItem = () => setItems([...items, { id: generateId(), name: '', rate: '', hours: '' }]);

  const removeLineItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const toggleHideItem = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, isHidden: !item.isHidden } : item)));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const data = await response.json();
      if (data.items && Array.isArray(data.items)) {
        const newItems = data.items.map((item: any) => ({
          id: generateId(),
          name: item.name || 'Extracted Item',
          rate: (item.rate ?? '').toString(),
          hours: (item.hours ?? '').toString(),
        }));
        
        // Append new items
        setItems((prev) => [...prev, ...newItems]);
      }
    } catch (error) {
      console.error(error);
      alert('Error parsing PDF. Please make sure it is a valid estimate document.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const { totalBudget, totalHours, weightedRate } = useMemo(() => {
    let budget = 0;
    let hours = 0;

    items.forEach((item) => {
      if (item.isHidden) return;
      const r = parseFloat(item.rate) || 0;
      const h = parseFloat(item.hours) || 0;
      budget += r * h;
      hours += h;
    });

    const wRate = hours > 0 ? budget / hours : 0;

    return { totalBudget: budget, totalHours: hours, weightedRate: wRate };
  }, [items]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 text-gray-900 flex justify-center">
      <div className="w-full max-w-4xl flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex items-center gap-3 pb-6 border-b border-gray-200">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Budget Calculator</h1>
            <p className="text-gray-500 font-medium">Compute blended rates and total budgets seamlessly in Euro.</p>
          </div>
        </header>

        {/* File Upload Section */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:border-blue-500 hover:bg-blue-50/30 transition-colors group relative cursor-pointer flex flex-col items-center justify-center text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={isUploading}
            ref={fileInputRef}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-blue-600">
              <Loader2 className="w-8 h-8 animate-spin" />
              <div className="font-semibold text-sm">Processing PDF... Extracting data securely</div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-gray-900 font-semibold mb-1">Upload PDF Estimate</h3>
              <p className="text-gray-500 text-sm max-w-sm">Drag and drop your PDF estimate here, or click to browse. We will automatically extract the line items.</p>
            </>
          )}
        </div>

        {/* Display Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col gap-1">
             <div className="flex items-center gap-2 text-gray-500 mb-2">
               <Euro className="w-4 h-4" />
               <span className="text-sm font-semibold uppercase tracking-wider">Total Budget</span>
             </div>
             <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalBudget)}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col gap-1">
             <div className="flex items-center gap-2 text-gray-500 mb-2">
               <Calculator className="w-4 h-4" />
               <span className="text-sm font-semibold uppercase tracking-wider">Weighted Avg Rate</span>
             </div>
             <div className="text-3xl font-bold text-gray-900">{formatCurrency(weightedRate)}<span className="text-lg text-gray-400 font-medium ml-1">/hr</span></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col gap-1">
             <div className="flex items-center gap-2 text-gray-500 mb-2">
               <Clock className="w-4 h-4" />
               <span className="text-sm font-semibold uppercase tracking-wider">Total Hours</span>
             </div>
             <div className="text-3xl font-bold text-gray-900">{totalHours.toLocaleString('de-DE')}</div>
          </div>
        </div>

        {/* Line Items List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-gray-400" />
              Line Items
            </h2>
            <button
              onClick={addLineItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-12 gap-4 mb-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-12 sm:col-span-5">Description</div>
              <div className="col-span-6 sm:col-span-3">Hourly Rate (€)</div>
              <div className="col-span-6 sm:col-span-3">Hours</div>
              <div className="col-span-12 sm:col-span-1 border-opacity-0"></div>
            </div>

            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {items.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-center py-8 text-gray-500 text-sm"
                  >
                    No line items added yet. Click "Add Item" or upload a PDF to start.
                  </motion.div>
                )}
                {items.map((item) => {
                  const itemRate = parseFloat(item.rate) || 0;
                  const itemHours = parseFloat(item.hours) || 0;
                  const subtotal = itemRate * itemHours;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className={`group flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-center p-2 rounded-xl border border-transparent transition-colors ${
                        item.isHidden
                          ? 'bg-gray-100/50 opacity-50 grayscale'
                          : 'bg-gray-50/50 hover:border-gray-200'
                      }`}
                    >
                      <div className="col-span-12 sm:col-span-5 w-full">
                        <input
                          type="text"
                          placeholder="e.g. Design phase"
                          value={item.name}
                          disabled={item.isHidden}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-3 w-full relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">€</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          disabled={item.isHidden}
                          onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-3 w-full relative">
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          step="0.5"
                          value={item.hours}
                          disabled={item.isHidden}
                          onChange={(e) => updateItem(item.id, 'hours', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">hrs</span>
                      </div>
                      <div className="col-span-12 sm:col-span-1 w-full flex items-center justify-between sm:justify-center">
                        <div className="sm:hidden text-sm font-medium text-gray-500">
                          Subtotal: <span className="text-gray-900">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleHideItem(item.id)}
                            className={`p-2 rounded-lg transition-colors focus:outline-hidden focus:ring-2 ${
                              item.isHidden
                                ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-200 focus:ring-gray-500/20'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 focus:ring-blue-500/20'
                            }`}
                            title={item.isHidden ? "Include item" : "Exclude item"}
                          >
                            {item.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
