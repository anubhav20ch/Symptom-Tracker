import React from 'react';
import { AlertTriangle, ShieldAlert, PhoneCall } from 'lucide-react';

export default function EmergencyBanner({ isCritical = false }) {
  if (isCritical) {
    return (
      <div className="alert-banner alert-emergency mb-6 shadow-md animate-fade-in">
        <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-bold text-red-900 dark:text-red-300 flex items-center gap-2">
            <span>URGENT MEDICAL ATTENTION RECOMMENDED</span>
            <span className="badge badge-critical text-xs">Emergency Alert</span>
          </div>
          <p className="mt-1 text-sm text-red-800 dark:text-red-200">
            Your reported symptoms suggest a high-severity or acute condition (such as chest pain, severe dyspnea, or neurological deficit). Please contact emergency ambulance services (<strong>108</strong> / <strong>102</strong>) or proceed to the nearest emergency department immediately.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="alert-banner alert-warning mb-6 shadow-sm">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <span className="font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mr-2">Advisory Notice:</span>
        <span className="text-amber-900 dark:text-amber-200">
          SymptomLog is an advisory tracking tool and does not provide certified medical diagnoses. In life-threatening emergencies, call emergency services (<strong>108</strong> / <strong>102</strong>) immediately.
        </span>
      </div>
    </div>
  );
}
