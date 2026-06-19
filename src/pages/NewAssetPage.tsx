import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AssetForm from '../components/AssetForm';
import { motion } from 'motion/react';

export function NewAssetPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-12 min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto mb-8">
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/assets')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Assets
        </motion.button>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
        >
          <AssetForm />
        </motion.div>
      </div>

      <div className="max-w-xl mx-auto text-center">
        <p className="text-gray-400 text-sm font-medium">
          Dallmayr SA Asset Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
