'use client';

import React from 'react';
import { useUXMonitoring } from '@/lib/ux-monitoring';
import type { UXReport, UXIssue, UXRecommendation } from '@/lib/ux-monitoring';

// ============================================
// COMPONENTES REACT
// ============================================

// Componente de dashboard UX
export function UXDashboard() {
  const { report, isCollecting, generateReport, startCollecting, stopCollecting } = useUXMonitoring();
  
  if (!report) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard UX</h2>
        <div className="flex gap-2">
          <button
            onClick={generateReport}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Atualizar
          </button>
          <button
            onClick={isCollecting ? stopCollecting : startCollecting}
            className={`px-4 py-2 rounded ${
              isCollecting 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isCollecting ? 'Parar' : 'Iniciar'}
          </button>
        </div>
      </div>
      
      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Interações"
          value={report.interactions.length}
          icon="👆"
        />
        <MetricCard
          title="Issues"
          value={report.issues.length}
          icon="⚠️"
          color={report.issues.length > 0 ? 'red' : 'green'}
        />
        <MetricCard
          title="Insights"
          value={report.insights.length}
          icon="💡"
        />
        <MetricCard
          title="Recomendações"
          value={report.recommendations.length}
          icon="📋"
        />
      </div>
      
      {/* Issues críticos */}
      {report.issues.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Issues Detectados</h3>
          <div className="space-y-3">
            {report.issues.slice(0, 5).map(issue => (
              <div key={issue.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{issue.description}</div>
                  <div className="text-sm text-gray-500">
                    Severidade: {issue.severity} | Impacto: {issue.impact}/10
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {issue.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Recomendações */}
      {report.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recomendações</h3>
          <div className="space-y-4">
            {report.recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="font-medium">{rec.title}</div>
                <div className="text-sm text-gray-600 mt-1">{rec.description}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Prioridade: {rec.priority} | Categoria: {rec.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de card de métrica
function MetricCard({ 
  title, 
  value, 
  icon, 
  color = 'blue' 
}: { 
  title: string; 
  value: number; 
  icon: string; 
  color?: string; 
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    yellow: 'bg-yellow-50 text-yellow-700'
  };
  
  return (
    <div className={`p-4 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

export default UXDashboard;
